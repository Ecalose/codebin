from deta import Deta
from fastapi import FastAPI
from fastapi.requests import Request
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

@app.get("/{code}")
async def view():
    return ContentResponse("./static/view.html", media_type="text/html")

@app.get("/file/{code}")
async def file():
    return ContentResponse("./static/file.html", media_type="text/html")

@app.get("/api/files/{code}")
async def fetch(code: str):
    fetched = app.db.get(code)
    if not fetched:
        return PlainTextResponse("not found", status_code=404)
    return JSONResponse({fetched["parent"]: fetched})

@app.get("/api/bins/{code}")
async def fetch(request: Request, code: str):
    fetched = app.db.fetch({"parent": code})
    last = fetched.last
    items = fetched.items
    while fetched.last:
        fetched = app.db.fetch({"parent": code}, last=last)
        items += fetched.items
        last = fetched.last
    return JSONResponse(fetched.items)

@app.post("/api/bins/{code}")
async def store(request: Request, code: str):
    return JSONResponse(app.db.put(await request.json(), code))

@app.delete("/api/bins/{code}")
async def delete(code: str):
    return app.db.delete(code)


@app.get("/modes/{name}")
async def file(name: str):
    return ContentResponse(f"./modes/{name}", media_type="application/octet-stream")

@app.get("/scripts/{name}")
async def file(name: str):
    return ContentResponse(f"./scripts/{name}", media_type="text/javascript")

@app.get("/styles/{name}")
async def file(name: str):
    return ContentResponse(f"./styles/{name}", media_type="text/css")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app)
