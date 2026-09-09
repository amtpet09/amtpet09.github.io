async function verifyPiAccessToken(token) {
  if (!token) throw new Error("Missing Pi access token.");

  const r = await fetch(PI_API_BASE + "/v2/me", {
    headers: {
      Authorization: "Bearer " + token,
      Accept: "application/json"
    }
  });

  const text = await r.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  console.log("PI /v2/me STATUS:", r.status);
  console.log("PI /v2/me RESPONSE:", JSON.stringify(data));

  if (!r.ok) {
    throw new Error(
      data?.error ||
      data?.message ||
      data?.error_message ||
      data?.detail ||
      data?.raw ||
      `HTTP ${r.status}`
    );
  }

  const user = {
    uid: data.uid || data.user?.uid || "",
    username: data.username || data.user?.username || "",
    wallet_address: data.wallet_address || data.user?.wallet_address || ""
  };

  if (!user.uid) {
    throw new Error("Pi API returned successfully but no user UID was found.");
  }

  return user;
}