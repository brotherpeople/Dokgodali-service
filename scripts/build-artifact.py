"""
dokgodali-quote-flow.html (개발용, images/ 상대경로) -> dokgodali-quote-flow.artifact.html
(공유/배포용, 이미지를 base64로 인라인 포함한 자체완결형 단일 파일) 로 변환합니다.

jsPDF / html2canvas 라이브러리는 이미 dokgodali-quote-flow.html 안에 인라인되어 있으므로
이 스크립트는 건드리지 않습니다 (라이브러리를 다시 넣어야 한다면 vendor/ 폴더의 파일을
참고해 <script> 블록으로 직접 삽입하세요).

사용법: python scripts/build-artifact.py   (저장소 루트에서 실행)
"""
import base64
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "dokgodali-quote-flow.html"
OUT = ROOT / "dokgodali-quote-flow.artifact.html"
IMAGES = ROOT / "images"


def b64(path):
    return base64.b64encode(path.read_bytes()).decode("ascii")


def main():
    html = SRC.read_text(encoding="utf-8")

    logo = b64(IMAGES / "logo.png")
    van_m = b64(IMAGES / "Vehicle - M.png")
    van_l = b64(IMAGES / "Vehicle - L.png")
    van_xl = b64(IMAGES / "Vehicle - XL.png")

    html = html.replace('src="images/logo.png"', f'src="data:image/png;base64,{logo}"')

    image_map_js = f"""
// 아티팩트(공유용) 배포본 전용: 외부 파일 대신 base64로 이미지를 인라인 포함합니다.
// 로컬 개발본(dokgodali-quote-flow.html)은 images/ 폴더 상대경로를 그대로 사용합니다.
const IMAGE_MAP = {{
  'Vehicle - M.png': 'data:image/png;base64,{van_m}',
  'Vehicle - L.png': 'data:image/png;base64,{van_l}',
  'Vehicle - XL.png': 'data:image/png;base64,{van_xl}',
}};
"""
    marker = "/* ================================================================\n   COMPANY_INFO"
    assert marker in html, "COMPANY_INFO marker not found — has dokgodali-quote-flow.html structure changed?"
    html = html.replace(marker, image_map_js + "\n" + marker, 1)

    html = html.replace("el.src = CONFIG.IMG_DIR + van.img;", "el.src = IMAGE_MAP[van.img];")

    OUT.write_text(html, encoding="utf-8")
    print(f"Wrote {OUT} ({len(html):,} bytes)")


if __name__ == "__main__":
    main()
