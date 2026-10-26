export default async () => {
  return new Response(JSON.stringify({ error: "Prompt Builder has been retired." }), {
    status: 410,
    headers: { "Content-Type": "application/json" }
  });
};

export const config = {
  path: "/api/claude"
};
