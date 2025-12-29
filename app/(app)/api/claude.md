# API Routes

## Route Pattern

```ts
// route.ts
import { auth } from '@/lib/auth';
import { ChatSDKError } from '@/lib/errors';

export async function POST(request: Request) {
  // 1. Validate request body
  const body = await request.json();
  const parsed = mySchema.safeParse(body);
  if (!parsed.success) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  // 2. Check authentication
  const session = await auth();
  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  // 3. Check authorization (user owns resource)
  const resource = await getResource(parsed.data.id);
  if (resource?.userId !== session.user.id) {
    return new ChatSDKError('forbidden:chat').toResponse();
  }

  // 4. Perform action
  const result = await doSomething(parsed.data);

  return Response.json(result);
}
```

## Error Handling

Use `ChatSDKError` from `lib/errors.ts`:
- `bad_request:api` - Invalid request body
- `unauthorized:chat` - Not logged in
- `forbidden:chat` - Not allowed to access resource
- `rate_limit:chat` - Too many requests
- `offline:chat` - Server error fallback

## Streaming (Chat Route)

See `chat/route.ts` for streaming pattern with `createUIMessageStream` and `streamText`.
