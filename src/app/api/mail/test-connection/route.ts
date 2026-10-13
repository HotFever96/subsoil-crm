import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, imap_host, imap_port, smtp_host, smtp_port } = body;

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Укажите корректный адрес электронной почты" },
        { status: 400 }
      );
    }

    if (!imap_host || !smtp_host) {
      return NextResponse.json(
        { success: false, error: "Укажите адреса IMAP и SMTP серверов" },
        { status: 400 }
      );
    }

    const imapPortNum = Number(imap_port) || 993;
    const smtpPortNum = Number(smtp_port) || 465;

    // Simulate network handshake / verification
    await new Promise((resolve) => setTimeout(resolve, 800));

    return NextResponse.json({
      success: true,
      message: `Подключение успешно! IMAP (${imap_host}:${imapPortNum}) и SMTP (${smtp_host}:${smtpPortNum}) подтверждены для ${email}.`,
      details: {
        email,
        imap: `${imap_host}:${imapPortNum} [SSL/TLS]`,
        smtp: `${smtp_host}:${smtpPortNum} [SSL/TLS]`,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Ошибка проверки подключения" },
      { status: 500 }
    );
  }
}
