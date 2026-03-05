import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { extractIngredientsFromImages } from "@/lib/products/vision";
import { randomUUID } from "crypto";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_IMAGES = 5;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const LABEL_IMAGES_BUCKET = "label-images";
const SIGNED_URL_EXPIRY = 3600; // 1 hour (for client preview only)

export const maxDuration = 30; // seconds — vision fallback chain can be slow

// ---------------------------------------------------------------------------
// POST /api/products/parse-label — upload images + extract ingredients via vision
// ---------------------------------------------------------------------------

const isDev = process.env.NODE_ENV === "development";
const DEV_USER_ID = "70360df8-4888-4401-9aa0-b2b15da354b0";

export async function POST(request: Request) {
  // 1. Auth
  let userId: string;
  if (isDev) {
    userId = DEV_USER_ID;
  } else {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return Response.json(
        { error: { message: "Authentication required." } },
        { status: 401 }
      );
    }
    userId = user.id;
  }

  // 2. Parse FormData
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json(
      { error: { message: "Expected multipart form data." } },
      { status: 400 }
    );
  }

  const files = formData.getAll("images").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return Response.json(
      { error: { message: "Missing 'images' file field." } },
      { status: 400 }
    );
  }

  if (files.length > MAX_IMAGES) {
    return Response.json(
      { error: { message: `Too many images. Maximum is ${MAX_IMAGES}.` } },
      { status: 400 }
    );
  }

  // 3. Validate each file
  for (const file of files) {
    if (!ALLOWED_TYPES.has(file.type)) {
      return Response.json(
        {
          error: {
            message: "Unsupported file type. Please upload JPEG, PNG, or WebP images.",
          },
        },
        { status: 400 }
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      return Response.json(
        { error: { message: "File too large. Maximum size is 5MB per image." } },
        { status: 400 }
      );
    }
  }

  // 4. Read all file buffers + run vision BEFORE uploading (avoids orphaned storage on failure)
  const buffers = await Promise.all(files.map(async (f) => ({
    buffer: Buffer.from(await f.arrayBuffer()),
    type: f.type,
  })));

  const visionImages = buffers.map((b) => ({
    base64: b.buffer.toString("base64"),
    mimeType: b.type,
  }));

  let visionResult;
  try {
    visionResult = await extractIngredientsFromImages(visionImages);
  } catch (err) {
    console.error("[parse-label] vision extraction error:", err);
    return Response.json(
      {
        error: {
          message:
            "Could not read ingredients from these images. Try clearer photos or enter ingredients manually.",
        },
      },
      { status: 422 }
    );
  }

  // 5. Vision succeeded — upload all to Supabase Storage
  const imagePaths: string[] = [];
  const imageUrls: string[] = [];

  for (let i = 0; i < buffers.length; i++) {
    const { buffer, type } = buffers[i];
    const ext = type.split("/")[1] === "jpeg" ? "jpg" : type.split("/")[1];
    const storagePath = `${userId}/${randomUUID()}.${ext}`;

    const { error: uploadError } = await adminClient.storage
      .from(LABEL_IMAGES_BUCKET)
      .upload(storagePath, buffer, {
        contentType: type,
        upsert: false,
      });

    if (uploadError) {
      console.error("[parse-label] upload error:", uploadError);
      imagePaths.push("");
      imageUrls.push("");
      continue;
    }

    imagePaths.push(storagePath);

    const { data: signedUrlData } = await adminClient.storage
      .from(LABEL_IMAGES_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_EXPIRY);

    imageUrls.push(signedUrlData?.signedUrl ?? "");
  }

  return Response.json({
    data: {
      imageUrls,
      imagePaths,
      isLabelScan: true,
      ingredients: visionResult.data.ingredients,
      productName: visionResult.data.product_name ?? null,
      brand: visionResult.data.brand ?? null,
    },
  });
}
