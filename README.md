AMT PET MARKETPLACE — PUBLIC MARKET FIX

Updated:
- Public pet listings include seller Pioneer wallet.
- Public egg listings include seller Pioneer wallet and are returned as listings + eggs.
- BUY PET verifies the buyer -> seller AMT Testnet transfer, then transfers pet ownership and marks listing SOLD.
- BUY EGG verifies the buyer -> seller AMT Testnet transfer, then transfers egg ownership and marks listing SOLD.
- Self-purchase and duplicate transaction protection.
- Issuer/distributor wallet is no longer returned by /api/wallet/config or AMT prepare.
- Frontend Public Sales now opens a verified AMT purchase modal instead of a placeholder toast.

IMPORTANT:
Public marketplace settlement currently uses a real AMT Testnet transaction hash because the exact Pi Browser custom-token signing API is not safely documented enough to invent. No private key or passphrase is requested from Pioneers.

Deploy server.js to Render. Keep AMT_DISTRIBUTOR_SECRET server-side only.

16
