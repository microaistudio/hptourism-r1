# HimKosh Integration - Technical Summary
**HP Tourism eServices Platform**  
**Date:** October 31, 2025

---

## Merchant Details
- **Merchant Code:** HIMKOSH230
- **Department ID:** CTO00-068
- **Service Code:** TSM
- **Head of Account:** 1452-00-800-01

---

## 1. BEFORE ENCRYPTION (Plain Text)

### Sample Request String (Pipe-Delimited):
```
DeptID=CTO00-068|DeptRefNo=APP20251031001|TotalAmount=5000|TenderBy=John Doe|AppRefNo=HPT17618812345ABC|Head1=1452-00-800-01|Amount1=5000|Head2=1452-00-800-01|Amount2=0|Ddo=KLU00-532|PeriodFrom=31-10-2025|PeriodTo=31-10-2025|Service_code=TSM|return_url=https://osipl.dev/api/himkosh/callback
```

### Checksum Calculation:
- **Algorithm:** MD5
- **Encoding:** ASCII
- **Input:** Plain request string (WITHOUT checksum field)
- **Output:** UPPERCASE hex (e.g., `A1B2C3D4E5F6...`)

### Full String Sent for Encryption:
```
[Plain Request String]|checkSum=[MD5_CHECKSUM]
```

---

## 2. ENCRYPTION PROCESS

### Algorithm Details (Matching eChallanED.dll):
- **Algorithm:** AES-128-CBC (RijndaelManaged)
- **Key Size:** 16 bytes (from echallan.key file)
- **IV Size:** 16 bytes (from echallan.key file)
- **Padding:** PKCS7
- **Encoding:** ASCII
- **Key File:** 32 bytes total (16-byte key + 16-byte IV)

### Process:
1. Build plain request string (pipe-delimited)
2. Calculate MD5 checksum (UPPERCASE)
3. Append checksum: `[string]|checkSum=[checksum]`
4. Encrypt entire string with AES-128-CBC
5. Encode encrypted bytes as Base64

---

## 3. AFTER ENCRYPTION (What We POST to HimKosh)

### POST to: 
`https://himkosh.hp.nic.in/echallan/WebPages/wrfApplicationRequest.aspx`

### Form Data:
```
MerchantCode = HIMKOSH230
encdata = [BASE64_ENCRYPTED_STRING]
```

### Sample Encrypted Output (Base64):
```
xK7J5mN9pQ2rT8vW3hF6... (400-600 characters)
```

---

## 4. RETURN URL SECURITY

**Development URL:** `https://osipl.dev/api/himkosh/callback`  
**Production URL:** `https://eservices.himachaltourism.gov.in/api/himkosh/callback`

**Note:** return_url is part of the encrypted string AND acts as a security whitelist. HimKosh decrypts the request and validates the return_url against merchant-specific whitelist before showing the payment form.

---

## 5. CURRENT STATUS

✅ Encryption implementation verified against eChallanED.dll  
✅ Successfully POST encrypted data to HimKosh portal  
✅ Reach payment form endpoint (wrfApplicationRequest.aspx)  
⏳ **BLOCKED:** Awaiting return_url whitelist for development URL

**Action Required:** Please whitelist `https://osipl.dev/api/himkosh/callback` for MERCHANT_CODE: HIMKOSH230

---

## 6. VERIFICATION (Round-Trip Test)

We can encrypt → decrypt and verify:
- Original string matches decrypted output ✅
- Checksum calculation is UPPERCASE MD5 ✅
- Encoding is ASCII (not UTF-8) ✅
- Algorithm matches .NET eChallanED.dll ✅

---

**Contact:** HP Tourism eServices Team  
**Email:** [Your email here]
