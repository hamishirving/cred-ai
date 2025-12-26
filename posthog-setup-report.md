# PostHog post-wizard report

The wizard has completed a deep integration of your Next.js AI chatbot application. PostHog has been configured using the recommended Next.js 15.3+ approach with `instrumentation-client.ts` for client-side initialization and `posthog-node` for server-side tracking. The integration includes:

- **Client-side analytics** via `instrumentation-client.ts` with automatic pageview tracking, error capturing, and session recording enabled
- **Server-side event tracking** for authentication flows using `posthog-node`
- **User identification** both client-side (via Supabase auth state changes) and server-side (during sign-up/sign-in)
- **Reverse proxy configuration** in `next.config.ts` to bypass ad blockers and improve data collection reliability
- **Error tracking** enabled via `capture_exceptions: true`

## Events Tracked

| Event | Description | File |
|-------|-------------|------|
| `user_signed_up` | User completed registration with email and password | `app/(auth)/actions.ts` |
| `user_signed_in` | User successfully logged in with email and password | `app/(auth)/actions.ts` |
| `user_signed_out` | User signed out from the application | `components/sign-out-form.tsx` |
| `message_sent` | User sent a chat message to the AI assistant | `components/multimodal-input.tsx` |
| `suggested_action_clicked` | User clicked on a suggested action to start a conversation | `components/suggested-actions.tsx` |
| `response_upvoted` | User upvoted an AI response for quality feedback | `components/message-actions.tsx` |
| `response_downvoted` | User downvoted an AI response for quality feedback | `components/message-actions.tsx` |
| `response_copied` | User copied an AI response to clipboard | `components/message-actions.tsx` |
| `model_changed` | User changed the AI model selection | `components/multimodal-input.tsx` |
| `chat_deleted` | User deleted a chat from their history | `components/sidebar-history.tsx` |
| `artifact_opened` | User opened an artifact to view/edit content | `components/artifact.tsx` |
| `document_saved` | User saved changes to a document artifact | `components/artifact.tsx` |

## Files Modified/Created

| File | Purpose |
|------|---------|
| `.env` | PostHog API key and host environment variables |
| `instrumentation-client.ts` | Client-side PostHog initialization |
| `lib/posthog-server.ts` | Server-side PostHog client singleton |
| `next.config.ts` | Reverse proxy rewrites for PostHog |
| `app/(auth)/actions.ts` | Server-side sign-up/sign-in tracking |
| `components/auth-provider.tsx` | Client-side user identification |
| `components/sign-out-form.tsx` | Sign-out event tracking |
| `components/multimodal-input.tsx` | Message sent and model change tracking |
| `components/suggested-actions.tsx` | Suggested action click tracking |
| `components/message-actions.tsx` | Response vote and copy tracking |
| `components/sidebar-history.tsx` | Chat deletion tracking |
| `components/artifact.tsx` | Artifact opened and document saved tracking |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

### Dashboard
- [Analytics Basics](https://eu.posthog.com/project/111067/dashboard/469791) - Core analytics dashboard tracking user engagement, authentication, and chat interactions

### Insights
- [User Sign-up to Message Funnel](https://eu.posthog.com/project/111067/insights/uVGmtlfU) - Conversion funnel from user registration to first message sent
- [Daily Active Users](https://eu.posthog.com/project/111067/insights/y1w05JZx) - Count of unique users sending messages each day
- [AI Response Quality Feedback](https://eu.posthog.com/project/111067/insights/2Qi1WT0u) - Ratio of upvotes vs downvotes on AI responses
- [User Retention - Sign-in Activity](https://eu.posthog.com/project/111067/insights/TvtBWCtI) - Returning users signing in over time
- [Feature Engagement - Model Changes](https://eu.posthog.com/project/111067/insights/NJs6oNsR) - How often users change AI models during their sessions
