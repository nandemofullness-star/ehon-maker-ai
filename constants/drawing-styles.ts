export interface DrawingStyle {
  id: string;
  label: string;
  emoji: string;
  description: string;
  /** English prompt fragment injected into the AI system prompt */
  promptFragment: string;
}

export const DRAWING_STYLES: DrawingStyle[] = [
  {
    id: "watercolor",
    label: "水彩画",
    emoji: "🎨",
    description: "やわらかな水彩絵の具タッチ",
    promptFragment:
      "soft watercolor illustration style with gentle washes of color, visible brush strokes, and a dreamy, translucent quality",
  },
  {
    id: "crayon",
    label: "クレヨン画",
    emoji: "🖍️",
    description: "温かみのあるクレヨンタッチ",
    promptFragment:
      "crayon drawing style with thick, textured strokes, warm and vibrant colors, and a hand-drawn childlike quality",
  },
  {
    id: "anime",
    label: "アニメ風",
    emoji: "✨",
    description: "鮮やかなアニメ・マンガ調",
    promptFragment:
      "anime illustration style with clean bold outlines, vibrant flat colors, expressive character design, and a Japanese animation aesthetic",
  },
  {
    id: "oilpaint",
    label: "油絵風",
    emoji: "🖼️",
    description: "重厚感のある油絵タッチ",
    promptFragment:
      "oil painting style with rich impasto texture, deep saturated colors, visible brushwork, and a classic fine-art quality",
  },
  {
    id: "papercut",
    label: "切り絵風",
    emoji: "✂️",
    description: "シンプルな切り絵・シルエット調",
    promptFragment:
      "paper cut art style with flat layered shapes, bold silhouettes, limited color palette, and a clean graphic quality",
  },
  {
    id: "pencil",
    label: "鉛筆スケッチ",
    emoji: "✏️",
    description: "繊細な鉛筆デッサン調",
    promptFragment:
      "pencil sketch illustration style with fine hatching lines, delicate shading, a hand-drawn quality, and subtle use of color",
  },
];

export const DEFAULT_STYLE_ID = "watercolor";

export function getStyleById(id: string): DrawingStyle {
  return DRAWING_STYLES.find((s) => s.id === id) ?? DRAWING_STYLES[0];
}
