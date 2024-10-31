import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(
  request: Request,
  { params }: { params: { letter: string } }
) {
  const letter = params.letter;
  
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 88,
          background: '#f3f4f6',
          color: '#4b5563',
          borderRadius: '50%',
        }}
      >
        {letter}
      </div>
    ),
    {
      width: 200,
      height: 200,
    },
  );
}
