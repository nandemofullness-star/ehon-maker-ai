import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { generateImage } from "./_core/imageGeneration";
import { storagePut } from "./storage";

// KDP standard: 8.5 inches at 300 DPI = 2550px, 215.9mm
const KDP_SIZE_MM = 215.9;

type PageType = "cover" | "back-cover" | "inner";

async function generatePdfBuffer(
  pages: Array<{ base64: string; text: string; pageType?: PageType }>
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
      const pageType: PageType = page.pageType ?? "inner";
      doc.addPage({ size: [pageSize, pageSize], margin: 0 });

      try {
        // Draw full-bleed image
        const imageBuffer = Buffer.from(page.base64, "base64");
        doc.image(imageBuffer, 0, 0, {
          width: pageSize,
          height: pageSize,
          cover: [pageSize, pageSize],
        });

        if (pageType === "cover") {
          // ---- COVER layout ----
          // Dark gradient overlay (top 60%)
          doc
            .rect(0, 0, pageSize, pageSize * 0.6)
            .fillOpacity(0.45)
            .fill("#1a1a2e");
          doc.fillOpacity(1);

          if (page.text && page.text.trim()) {
            const titleFontSize = pageSize * 0.11;
            const margin = pageSize * 0.08;
            const titleY = pageSize * 0.12;

            // Shadow pass
            doc
              .fontSize(titleFontSize)
              .fillColor("black")
              .fillOpacity(0.4)
              .text(page.text, margin + 3, titleY + 3, {
                width: pageSize - margin * 2,
                align: "center",
              });

            // Main title
            doc
              .fillColor("white")
              .fillOpacity(1)
              .text(page.text, margin, titleY, {
                width: pageSize - margin * 2,
                align: "center",
              });
          }

          // "表紙" label badge at bottom-right
          const badgeFontSize = pageSize * 0.028;
          const badgeW = pageSize * 0.18;
          const badgeH = pageSize * 0.055;
          const badgeX = pageSize - badgeW - pageSize * 0.04;
          const badgeY = pageSize - badgeH - pageSize * 0.04;
          doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 6).fillOpacity(0.75).fill("#4F46E5");
          doc
            .fillColor("white")
            .fillOpacity(1)
            .fontSize(badgeFontSize)
            .text("表紙", badgeX, badgeY + (badgeH - badgeFontSize) / 2, {
              width: badgeW,
              align: "center",
            });
        } else if (pageType === "back-cover") {
          // ---- BACK COVER layout ----
          // Gradient overlay at bottom 50%
          doc
            .rect(0, pageSize * 0.5, pageSize, pageSize * 0.5)
            .fillOpacity(0.5)
            .fill("#0f0f1a");
          doc.fillOpacity(1);

          if (page.text && page.text.trim()) {
            const authorFontSize = pageSize * 0.055;
            const margin = pageSize * 0.08;
            const authorY = pageSize * 0.72;

            // Shadow
            doc
              .fontSize(authorFontSize)
              .fillColor("black")
              .fillOpacity(0.35)
              .text(page.text, margin + 2, authorY + 2, {
                width: pageSize - margin * 2,
                align: "center",
              });

            // Author name
            doc
              .fillColor("white")
              .fillOpacity(1)
              .text(page.text, margin, authorY, {
                width: pageSize - margin * 2,
                align: "center",
              });
          }

          // "裏表紙" label badge at bottom-right
          const badgeFontSize = pageSize * 0.028;
          const badgeW = pageSize * 0.22;
          const badgeH = pageSize * 0.055;
          const badgeX = pageSize - badgeW - pageSize * 0.04;
          const badgeY = pageSize - badgeH - pageSize * 0.04;
          doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 6).fillOpacity(0.75).fill("#7C3AED");
          doc
            .fillColor("white")
            .fillOpacity(1)
            .fontSize(badgeFontSize)
            .text("裏表紙", badgeX, badgeY + (badgeH - badgeFontSize) / 2, {
              width: badgeW,
              align: "center",
            });
        } else {
          // ---- INNER PAGE layout (original behavior) ----
          if (page.text && page.text.trim()) {
            const fontSize = pageSize * 0.04;
            const margin = pageSize * 0.08;

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
        }
      } catch (err) {
        console.error(`Page ${i + 1} image error:`, err);
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
            pageType: z.enum(["cover", "back-cover", "inner"]).optional(),
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
