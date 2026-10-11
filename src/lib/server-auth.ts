export async function verifyFirebaseBearerToken(request: Request): Promise<string> {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    throw new Error("Authentication is required.");
  }

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) {
    throw new Error("Firebase server authentication is not configured.");
  }

  const idToken = authorization.slice("Bearer ".length).trim();
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    }
  );

  if (!response.ok) {
    throw new Error("Invalid or expired authentication token.");
  }

  const data = await response.json();
  const uid = data.users?.[0]?.localId;
  if (!uid) throw new Error("Authenticated user was not found.");
  return uid;
}
