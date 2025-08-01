import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/datasets/$slug')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_app/datasets/$slug"!</div>
}
