import jinja2
import uvicorn
from deta import Deta
from fastapi import FastAPI
from fastapi.requests import Request
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse, Response, RedirectResponse


class ContentResponse(Response):
    def __init__(self, path: str, **kwargs):
        with open(path, "rb") as f:
            content = f.read()
        super().__init__(content=content, **kwargs)
               
app = FastAPI()
pages = Jinja2Templates(directory="static")
app.add_middleware(CORSMiddleware, allow_origins=["*"])

@app.get("/")
async def index(request: Request):
    return pages.TemplateResponse("index.html", {"request": request})

@app.get("/assets/{name}")
async def file(name: str):
    return ContentResponse(f"./assets/{name}", media_type="application/octet-stream")

@app.get("/modes/{name}")
async def file(name: str):
    return ContentResponse(f"./modes/{name}", media_type="application/octet-stream")

@app.get("/scripts/{name}")
async def file(name: str):
    return ContentResponse(f"./scripts/{name}", media_type="text/javascript")

@app.get("/styles/{name}")
async def file(name: str):
    return ContentResponse(f"./styles/{name}", media_type="text/css")

@app.get("/{code}")
async def view(request: Request, code: str):
    return pages.TemplateResponse("view.html", {"request": request, "code": code})

@app.get("/base/{code}")
async def fetch(request: Request, code: str):
    deta = Deta()
    db = deta.Base("codebin")
    item = db.get(code)
    if item is None:
        return JSONResponse({"error": "File not found!"}, status_code=404)
    return JSONResponse(item)

@app.post("/base/{code}")
async def store(request: Request, code: str):
    payload = await request.json()
    if code:
        deta = Deta()
        db = deta.Base("codebin")
        db.put(payload, code)
        return PlainTextResponse(code)


if __name__ == "__main__":
    uvicorn.run(app)
