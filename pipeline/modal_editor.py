"""Image editing on a Modal GPU (Qwen-Image-Edit-2511). Used by pipeline/mascot.py to draw the Debug Bro cartoon.

The model weights (~58 GB) are cached in the Modal volume "debug-bro-hf-cache", so only the first run downloads them.
Auth: MODAL_TOKEN_ID / MODAL_TOKEN_SECRET in the environment (GitHub secrets).
"""
import io
import os

import modal

MODEL = os.environ.get("EDIT_MODEL", "Qwen/Qwen-Image-Edit-2511")
GPU = os.environ.get("MODAL_GPU", "H100")

app = modal.App("debug-bro-mascot")
cache = modal.Volume.from_name("debug-bro-hf-cache", create_if_missing=True)
image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("git")
    .pip_install(
        "torch==2.7.1",
        "transformers>=4.51,<5",
        "accelerate",
        "safetensors",
        "sentencepiece",
        "pillow",
        "huggingface_hub",
        "git+https://github.com/huggingface/diffusers",
    )
    .env({"HF_HOME": "/cache", "EDIT_MODEL": MODEL})
)


@app.cls(gpu=GPU, image=image, volumes={"/cache": cache}, timeout=3600, scaledown_window=90)
class Editor:
    @modal.enter()
    def load(self):
        import torch
        from diffusers import QwenImageEditPlusPipeline

        self.pipe = QwenImageEditPlusPipeline.from_pretrained(os.environ["EDIT_MODEL"], torch_dtype=torch.bfloat16)
        self.pipe.to("cuda")
        self.pipe.set_progress_bar_config(disable=True)
        cache.commit()

    @modal.method()
    def edit(self, images: list[bytes], prompt: str, seeds: list[int], steps: int = 40,
             width: int = 832, height: int = 1248) -> list[bytes]:
        import torch
        from PIL import Image

        refs = [Image.open(io.BytesIO(b)).convert("RGB") for b in images]
        out = []
        for seed in seeds:
            args = dict(image=refs, prompt=prompt, generator=torch.manual_seed(seed), true_cfg_scale=4.0,
                        negative_prompt="realistic photo, 3d render, text, watermark, extra fingers, cropped body",
                        num_inference_steps=steps, guidance_scale=1.0, num_images_per_prompt=1)
            with torch.inference_mode():
                try:
                    img = self.pipe(**args, width=width, height=height).images[0]
                except TypeError:
                    img = self.pipe(**args).images[0]
            buf = io.BytesIO()
            img.save(buf, "PNG")
            out.append(buf.getvalue())
        return out
