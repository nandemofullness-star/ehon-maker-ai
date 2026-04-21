import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { generateImage } from "./_core/imageGeneration";
import { storagePut } from "./storage";

// KDP standard: 8.5 inches at 300 DPI = 2550px, 215.9mm
const KDP_SIZE_MM = 215.9;

async function generatePdfBuffer(
  pages: Array<{ base64: string; text: string }>
): Promise<Buffer> {
  // Dynamic import for pdfkit (CommonJS module)
  const PDFDocument = (await import("pdfkit")).default;

  return new Promise((resolve, reject) => {
    const mmToPoints = (mm: number) => mm * 2.8346456693;
    const pageSize = mmToPoints(KDP_SIZE_MM);

    const doc = new PDFDocument({
      size: [pageSize, pageSize],
      margin: 0,
      autoFirstPage: false,
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      doc.addPage({ size: [pageSize, pageSize], margin: 0 });

      try {
        // Decode base64 image and add to PDF
        const imageBuffer = Buffer.from(page.base64, "base64");
        doc.image(imageBuffer, 0, 0, {
          width: pageSize,
          height: pageSize,
          cover: [pageSize, pageSize],
        });

        // Add text if present
        if (page.text && page.text.trim()) {
          const fontSize = pageSize * 0.04;
          const margin = pageSize * 0.08;

          // Text shadow/outline for legibility
          doc
            .fontSize(fontSize)
            .fillColor("white")
            .opacity(0.9)
            .text(page.text, margin, pageSize - margin - fontSize * 2, {
              width: pageSize - margin * 2,
              align: "center",
            });

          doc
            .fillColor("#2D3748")
            .opacity(1)
            .text(page.text, margin, pageSize - margin - fontSize * 2, {
              width: pageSize - margin * 2,
              align: "center",
            });
        }
      } catch (err) {
        console.error(`Page ${i + 1} image error:`, err);
        // Add blank white page on error
        doc.rect(0, 0, pageSize, pageSize).fill("white");
      }
    }

    doc.end();
  });
}

// Style-specific prompt fragments (must match constants/drawing-styles.ts)
const STYLE_PROMPTS: Record<string, string> = {
  watercolor:
    "soft watercolor illustration style with gentle washes of color, visible brush strokes, and a dreamy, translucent quality",
  crayon:
    "crayon drawing style with thick, textured strokes, warm and vibrant colors, and a hand-drawn childlike quality",
  anime:
    "anime illustration style with clean bold outlines, vibrant flat colors, expressive character design, and a Japanese animation aesthetic",
  oilpaint:
    "oil painting style with rich impasto texture, deep saturated colors, visible brushwork, and a classic fine-art quality",
  papercut:
    "paper cut art style with flat layered shapes, bold silhouettes, limited color palette, and a clean graphic quality",
  pencil:
    "pencil sketch illustration style with fine hatching lines, delicate shading, a hand-drawn quality, and subtle use of color",
};

export const bookRouter = router({
  // AI image remake: transform photo to storybook illustration
  remakeImage: publicProcedure
    .input(
      z.object({
        imageBase64: z.string(),
        mimeType: z.string().default("image/jpeg"),
        drawingStyle: z.string().default("watercolor"),
      })
    )
    .mutation(async ({ input }) => {
      const styleFragment =
        STYLE_PROMPTS[input.drawingStyle] ?? STYLE_PROMPTS["watercolor"];

      const result = await generateImage({
        prompt:
          `GENERATE IMAGE: Transform this photo into a cute, simple storybook illustration for a 3-year-old child. ` +
          `Drawing style: ${styleFragment}. ` +
          `The main subject should be clearly recognizable. Keep it child-friendly, warm, and engaging. 1:1 aspect ratio.`,
        originalImages: [
          {
            b64Json: input.imageBase64,
            mimeType: input.mimeType,
          },
        ],
      });

      return {
        imageUrl: result.url ?? null,
      };
    }),

  // Generate KDP PDF from pages
  generatePdf: publicProcedure
    .input(
      z.object({
        pages: z.array(
          z.object({
            base64: z.string(),
            text: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      if (input.pages.length === 0) {
        throw new Error("ページが空です");
      }

      const pdfBuffer = await generatePdfBuffer(input.pages);

      // Upload PDF to storage
      const { url } = await storagePut(
        `pdfs/kdp_picture_book_${Date.now()}.pdf`,
        pdfBuffer,
        "application/pdf"
      );

      return {
        pdfUrl: url,
      };
    }),
});
