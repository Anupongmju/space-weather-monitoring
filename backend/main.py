from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.openapi.docs import get_swagger_ui_html
from database import init_db
from routers import ace, goes, cosmic, maw, news, enlil, archive_ace, radiation
from scheduler import start_scheduler
 
@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    start_scheduler()
    yield

app = FastAPI(title="Space Weather API", version="1.0", lifespan=lifespan, docs_url=None, redoc_url=None)

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    return get_swagger_ui_html(
        openapi_url=app.openapi_url or "/openapi.json",
        title=app.title + " - Swagger UI",
        oauth2_redirect_url=app.swagger_ui_oauth2_redirect_url,
        swagger_js_url="/static/swagger-ui/swagger-ui-bundle.js",
        swagger_css_url="/static/swagger-ui/swagger-ui.css",
        swagger_favicon_url="/static/swagger-ui/favicon-32x32.png",
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ace.router)
app.include_router(goes.router)
app.include_router(cosmic.router)
app.include_router(maw.router)
app.include_router(news.router)
app.include_router(enlil.router)
app.include_router(archive_ace.router)
app.include_router(radiation.router)

@app.get("/")
def root():
    return {"status": "ok", "message": "Space Weather API running"}

@app.post("/fetch/all")
def fetch_all():
    from fetchers.ace_fetcher import fetch_all_ace
    from fetchers.goes_fetcher import fetch_all_goes
    from fetchers.cosmic_fetcher import fetch_all_cosmic
    from fetchers.stereo_fetcher import fetch_stereo_particles
    from fetchers.solar1_fetcher import fetch_solar1_rtsw
    from fetchers.crater_fetcher import fetch_crater_doserates
    return {
        "ace":       fetch_all_ace(),
        "goes":      fetch_all_goes(),
        "cosmic":    fetch_all_cosmic(),
        "stereo":    fetch_stereo_particles(),
        "solar1":    fetch_solar1_rtsw(),
        "crater":    fetch_crater_doserates()
    }
