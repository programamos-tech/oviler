import { NextRequest, NextResponse } from "next/server";

/**
 * Subida de foto de empleado a bucket (S3, Cloudflare R2, etc.).
 * Por ahora devuelve una URL mock. Para producción:
 * 1. Configurar credenciales del bucket en env (ej. AWS_ACCESS_KEY_ID, BUCKET_NAME).
 * 2. Usar @aws-sdk/client-s3 o similar para putObject con el file recibido.
 * 3. Devolver la URL pública del objeto (o signed URL si es privado).
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const employeeId = formData.get("employeeId") as string | null;

    if (!file || !file.size) {
      return NextResponse.json(
        { error: "No se envió ningún archivo" },
        { status: 400 }
      );
    }

    const maxSize = 5 * 1024 * 1024; // 5 MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "El archivo no debe superar 5 MB" },
        { status: 400 }
      );
    }

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      return NextResponse.json(
        { error: "Formato no permitido. Usa JPEG, PNG, WebP o GIF." },
        { status: 400 }
      );
    }

    // TODO: subir a tu bucket (S3/R2) y devolver la URL real.
    // Ejemplo con nombre único:
    // const key = `employees/${employeeId || crypto.randomUUID()}/${file.name}`;
    // await s3.putObject({ Bucket: process.env.BUCKET_NAME, Key: key, Body: buffer });
    // const url = `https://${process.env.BUCKET_NAME}.s3.../${key}`;

    const mockUrl = `/uploads/employees/${employeeId || "temp"}-${Date.now()}-${file.name}`;
    return NextResponse.json({ url: mockUrl });
  } catch (e) {
    console.error("Upload employee photo:", e);
    return NextResponse.json(
      { error: "Error al subir la foto" },
      { status: 500 }
    );
  }
}
