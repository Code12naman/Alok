export function getFirebaseBearerToken(request: Request): string {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    throw new Error("Authentication is required.");
  }
  const idToken = authorization.slice("Bearer ".length).trim();
  if (!idToken) throw new Error("Authentication is required.");
  return idToken;
}

export async function verifyFirebaseBearerToken(request: Request): Promise<string> {
  const idToken = getFirebaseBearerToken(request);

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) {
    throw new Error("Firebase server authentication is not configured.");
  }

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

export async function verifyFirebaseAdmin(request: Request): Promise<string> {
  const idToken = getFirebaseBearerToken(request);
  const uid = await verifyFirebaseBearerToken(request);
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error("Firebase server authentication is not configured.");

  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${encodeURIComponent(uid)}`,
    { headers: { Authorization: `Bearer ${idToken}` } }
  );
  if (!response.ok) {
    if (response.status === 404) throw new Error("Admin profile document not found.");
    throw new Error("Unable to verify administrator profile.");
  }
  const profile = await response.json();
  if (profile.fields?.role?.stringValue !== "admin") {
    throw new Error("Administrator privileges are required.");
  }
  return uid;
}
