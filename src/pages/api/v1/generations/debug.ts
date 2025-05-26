import type { APIRoute } from 'astro';
import { GenerationService } from '../../../../lib/services/generation.service';

export const GET: APIRoute = async ({ url, locals }) => {
  try {
    const generationId = url.searchParams.get('id');
    
    if (!generationId) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Generation ID is required',
          },
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const details = await GenerationService.getGenerationDetails(
      locals.supabase,
      generationId
    );

    return new Response(
      JSON.stringify(details),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Error fetching generation details:', err);
    return new Response(
      JSON.stringify({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error',
        },
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}; 