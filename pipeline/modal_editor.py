"""Image editing on a Modal GPU. Used by pipeline/mascot.py to draw the Debug Bro cartoon.

Default: FLUX.2 [klein] 4B (Apache 2.0, ~13 GB VRAM) on an L4, which runs on Modal's free credits without a card.
With a card on the Modal account, EDIT_MODEL=Qwen/Qwen-Image-Edit-2511 + MODAL_GPU=H100 gives stronger likeness.
The model weights are cached in the Modal volume "debug-bro-hf-cache", so only the first run downloads them.
Auth: MODAL_TOKEN_ID / MODAL_TOKEN_SECRET in the environment (GitHub secrets).
"""
import io
import os

import modal

MODEL = os.environ.get("EDIT_MODEL", "black-forest-labs/FLUX.2-klein-4B")
GPU = os.environ.get("MODAL_GPU", "L4")
KLEIN = "klein" in MODEL.lower()

app = modal.App("debug-bro-mascot")
cache = modal.Volume.from_name("debug-bro-hf-cache", create_if_missing=True)
image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("git")
    .pip_install(
        "torch==2.9.1",
        "transformers",
        "accelerate",
        "safetensors",
        "sentencepiece",
        "pillow",
        "huggingface_hub",
        "git+https://github.com/huggingface/diffusers",
    )
    .env({"HF_HOME": "/cache", "EDIT_MODEL": MODEL, "HF_XET_HIGH_PERFORMANCE": "1"})
)


@app.cls(gpu=GPU, image=image, volumes={"/cache": cache}, timeout=3600, scaledown_window=90)
class Editor:
    @modal.enter()
    def load(self):
        import torch
        import diffusers

        cls = diffusers.Flux2KleinPipeline if KLEIN else diffusers.QwenImageEditPlusPipeline
        self.pipe = cls.from_pretrained(os.environ["EDIT_MODEL"], torch_dtype=torch.bfloat16)
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
            gen = torch.Generator("cuda").manual_seed(seed)
            if KLEIN:
                args = dict(prompt=prompt, generator=gen, num_inference_steps=4, guidance_scale=1.0)
            else:
                args = dict(prompt=prompt, generator=gen, true_cfg_scale=4.0, num_inference_steps=steps,
                            negative_prompt="realistic photo, 3d render, text, watermark, extra fingers, cropped body",
                            guidance_scale=1.0, num_images_per_prompt=1)
            with torch.inference_mode():
                try:
                    img = self.pipe(image=refs, width=width, height=height, **args).images[0]
                except (TypeError, ValueError) as e:  # some pipelines take one reference image only
                    print(f"multi-image call failed ({e}); retrying with the first image")
                    img = self.pipe(image=refs[0], width=width, height=height, **args).images[0]
            buf = io.BytesIO()
            img.save(buf, "PNG")
            out.append(buf.getvalue())
        return out
