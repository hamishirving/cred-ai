export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: chatId } = await params;

  // Stream resumption is disabled
  // Return 204 No Content to indicate no stream is available
  return new Response(null, { status: 204 });
}
