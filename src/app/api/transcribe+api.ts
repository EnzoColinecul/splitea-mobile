export async function POST(request: Request) {
  try {
    const backendUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api';
    
    const response = await fetch(`${backendUrl}/expense/transcribe-instruction`, {
      method: 'POST',
      body: request.body,
      // @ts-ignore - duplex is required for streaming in some environments
      duplex: 'half',
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Content-Type': request.headers.get('Content-Type') || '',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return Response.json(errorData, { status: response.status });
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error: any) {
    console.error('Transcription API Error:', error);
    return Response.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
