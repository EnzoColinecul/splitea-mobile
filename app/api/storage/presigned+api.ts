export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('event_id');
    const filename = searchParams.get('filename');

    if (!eventId || !filename) {
      return Response.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const backendUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api';
    const response = await fetch(`${backendUrl}/expense/presigned-url?event_id=${eventId}&filename=${filename}`, {
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
      },
    });

    if (!response.ok) {
      return Response.json({ error: 'Failed to fetch presigned URL' }, { status: response.status });
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error: any) {
    console.error('Presigned URL API Error:', error);
    return Response.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
