"""
Gera os SVGs da marca Dá Jogo em public/brand/ e public/favicon.svg.

O logotipo tem o texto "dá jogo" convertido em contornos (Plus Jakarta Sans 800),
para não depender de fonte instalada. Rodar só quando a marca mudar:

    pip install fonttools
    python3 scripts/brand/build-brand-svgs.py

Os PNGs (ícones do PWA) são gerados depois por `pnpm icons`.
"""
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[2]
FONT = ROOT / "node_modules/@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-800-normal.woff"
OUT = ROOT / "public/brand"
OUT.mkdir(parents=True, exist_ok=True)

NAVY, MINT, WHITE, SUN = "#142a40", "#5fd49c", "#ffffff", "#ffc94d"
WORD = "dá jogo"
TRACKING_EM = -0.045


def symbol(stem: str, ball: str) -> str:
    """Símbolo "O salto" no quadro 0..200 (docs/design-system/README.md › Logotipo)."""
    return (
        f'<path d="M116 86 L106 140 C100 174 76 186 48 174" fill="none" stroke="{stem}" '
        f'stroke-width="32" stroke-linecap="round" stroke-linejoin="round"/>'
        f'<circle cx="138" cy="44" r="28" fill="{ball}"/>'
    )


def wordmark_path(size: float) -> tuple[str, float, float, float]:
    """Contorno do texto em `size` px de corpo. Retorna (d, largura, ascendente, descendente)."""
    font = TTFont(FONT)
    glyph_set = font.getGlyphSet()
    cmap = font.getBestCmap()
    upm = font["head"].unitsPerEm
    scale = size / upm
    ascent = font["hhea"].ascent * scale
    descent = -font["hhea"].descent * scale
    hmtx = font["hmtx"]

    x = 0.0
    parts = []
    for ch in WORD:
        name = cmap[ord(ch)]
        pen = SVGPathPen(glyph_set)
        # y do SVG cresce para baixo: espelha e põe a linha de base em y = ascent
        glyph_set[name].draw(TransformPen(pen, (scale, 0, 0, -scale, x, ascent)))
        if pen.getCommands():
            parts.append(pen.getCommands())
        x += hmtx[name][0] * scale + TRACKING_EM * size
    width = x - TRACKING_EM * size
    return " ".join(parts), width, ascent, descent


def svg(width: float, height: float, body: str, title: str) -> str:
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width:.1f} {height:.1f}" '
        f'role="img" aria-label="{title}"><title>{title}</title>{body}</svg>\n'
    )


def logo(stem: str, ball: str, text: str) -> str:
    size = 100.0
    d, w, ascent, descent = wordmark_path(size)
    text_h = ascent + descent
    # contorno real do símbolo dentro do quadro 0..200 (traço de 32 com pontas redondas)
    sx0, sy0, sx1, sy1 = 32, 16, 166, 190
    sym_h = text_h * 1.1
    k = sym_h / (sy1 - sy0)
    sym_w = (sx1 - sx0) * k
    gap = size * 0.14
    height = max(sym_h, text_h)
    body = (
        f'<g transform="translate({-sx0 * k:.2f} {(height - sym_h) / 2 - sy0 * k:.2f}) scale({k:.4f})">{symbol(stem, ball)}</g>'
        f'<path transform="translate({sym_w + gap:.1f} {(height - text_h) / 2:.1f})" fill="{text}" d="{d}"/>'
    )
    return svg(sym_w + gap + w, height, body, "Dá Jogo")


def app_icon(maskable: bool = False) -> str:
    """Ícone do app: fundo azul-marinho, haste branca, bola amarelo-sol."""
    if maskable:
        # área segura do ícone mascarável: círculo de 80%; o símbolo ocupa ~56% do lado
        bg = f'<rect width="512" height="512" fill="{NAVY}"/>'
        mark = f'<g transform="translate(112 112) scale(1.44)">{symbol(WHITE, SUN)}</g>'
    else:
        bg = f'<rect width="512" height="512" rx="115" fill="{NAVY}"/>'
        mark = f'<g transform="translate(56 56) scale(2)">{symbol(WHITE, SUN)}</g>'
    return svg(512, 512, bg + mark, "Dá Jogo")


files = {
    OUT / "symbol.svg": svg(200, 200, symbol(NAVY, MINT), "Dá Jogo"),
    OUT / "symbol-on-dark.svg": svg(200, 200, symbol(WHITE, SUN), "Dá Jogo"),
    OUT / "logo.svg": logo(NAVY, MINT, NAVY),
    OUT / "logo-on-dark.svg": logo(WHITE, SUN, WHITE),
    OUT / "app-icon.svg": app_icon(),
    OUT / "app-icon-maskable.svg": app_icon(maskable=True),
    ROOT / "public/favicon.svg": app_icon(),
}
for path, content in files.items():
    path.write_text(content)
    print(f"{path.relative_to(ROOT)}  ({len(content) // 1024 or 1} KB)")
