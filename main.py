import jinja2
import uvicorn
from deta import Deta
from fastapi import FastAPI
from fastapi.requests import Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse, Response


class ContentResponse(Response):
    def __init__(self, path: str, **kwargs):
        with open(path, "rb") as f:
            content = f.read()
            super().__init__(content=content, **kwargs)
               
app = FastAPI()
app.db = Deta().Base('codebin')
app.add_middleware(CORSMiddleware, allow_origins=["*"])

@app.get("/")
async def index(request: Request):
    return ContentResponse("./static/index.html", media_type="text/html")

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
    return ContentResponse("./static/view.html", media_type="text/html")

@app.get("/file/{code}")
async def file(request: Request, code: str):
    return ContentResponse("./static/file.html", media_type="text/html")

@app.get("/base/file/{code}")
async def fetch(request: Request, code: str):
    fetched = app.db.get(code)
    if not fetched:
        return PlainTextResponse("File not found!", status_code=404)
    payload = {fetched["parent"]: fetched}
    return JSONResponse(payload)

@app.get("/base/{code}")
async def fetch(request: Request, code: str):
    fetched = app.db.fetch({"parent": code})
    if not fetched:
        return PlainTextResponse("File not found!", status_code=404)
    payload = {item.pop("key"): item for item in fetched.items}
    return JSONResponse(payload)

@app.post("/base/{code}")
async def store(request: Request, code: str):
    app.db.put(await request.json(), code)
    return PlainTextResponse(code)


if __name__ == "__main__":
    uvicorn.run(app)
