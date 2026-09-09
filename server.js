async function verifyPiAccessToken(token) {
  if (!token) {
    throw new Error("Missing Pi access token.");
  }

  const url = PI_API_BASE + "/v2/me";

  try {
    const r = await fetch(url, {
      method: "GET",
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

    // Diagnostic logs — walang token o API key na ipinapakita
    console.log("PI /v2/me STATUS:", r.status);
    console.log(
      "PI /v2/me RESPONSE:",
      JSON.stringify(data)
    );

    if (!r.ok) {
      const piError =
        data?.error ||
        data?.message ||
        data?.error_message ||
        data?.detail ||
        data?.raw ||
        `HTTP ${r.status}`;

      throw new Error(
        `Pi /v2/me HTTP ${r.status}: ${piError}`
      );
    }

    const user = {
      uid:
        data.uid ||
        data.user?.uid ||
        "",

      username:
        data.username ||
        data.user?.username ||
        "",

      wallet_address:
        data.wallet_address ||
        data.user?.wallet_address ||
        ""
    };

    if (!user.uid) {
      console.error(
        "PI /v2/me returned no UID:",
        JSON.stringify(data)
      );

      throw new Error(
        "Pi API returned successfully but no user UID was found."
      );
    }

    return user;

  } catch (err) {
    console.error(
      "PI ACCESS TOKEN VERIFY ERROR:",
      err.message
    );

    throw err;
  }
}