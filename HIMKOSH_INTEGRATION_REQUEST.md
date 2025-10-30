# HimKosh Integration Technical Support Request

**To:** dto-cyt-hp@nic.in  
**Subject:** HimKosh eChallan Encryption Format - Technical Assistance Required  
**Merchant Code:** HIMKOSH230  
**Department:** CTO00-068 (HP Tourism)

---

## Issue Summary

We are integrating HimKosh payment gateway for HP Tourism's new digital ecosystem. Despite implementing standard AES-128-CBC encryption with the provided `echallan.key` file, the HimKosh portal shows "CHECK SUM MISMATCH" with empty form fields, indicating decryption failure.

---

## What We've Implemented

### 1. Encryption Specification
- **Algorithm:** AES-128-CBC
- **Key:** 16 bytes from echallan.key (bytes 0-15)
- **IV:** 16 bytes from echallan.key (bytes 16-31)
- **Padding:** PKCS7
- **Encoding:** ASCII (not UTF-8)
- **Output:** Base64, then URL-encoded

### 2. Checksum Calculation
- **Algorithm:** MD5
- **Input:** Plain text string (WITHOUT checksum appended)
- **Format:** Uppercase hexadecimal (e.g., `E0859A53EFF0FEAFF57E56FC6216B8AA`)

### 3. POST Parameters
```
merchant_code = HIMKOSH230
encdata = [URL-encoded Base64 encrypted data]
checksumhash = [Uppercase MD5 checksum]
```

### 4. Plain Text Format
```
DeptID=CTO00-068|DeptRefNo=HP-HS-2025-000025|TotalAmount=4200|TenderBy=Test Owner|AppRefNo=HPT1761821156043bLrQ|Head1=1452-00-800-01|Amount1=4200|Ddo=SML00-532|PeriodFrom=10-30-2025|PeriodTo=10-30-2025|Service_code=TSM|return_url=https://osipl.dev/api/himkosh/callback
```

### 5. Sample Request Data
**Plain String (268 chars):**
```
DeptID=CTO00-068|DeptRefNo=HP-HS-2025-000025|TotalAmount=4200|TenderBy=Test Owner|AppRefNo=HPT1761821156043bLrQ|Head1=1452-00-800-01|Amount1=4200|Ddo=SML00-532|PeriodFrom=10-30-2025|PeriodTo=10-30-2025|Service_code=TSM|return_url=https://osipl.dev/api/himkosh/callback
```

**Encrypted (Base64, 364 chars):**
```
igTK5MTF37qcOAes8TNaB/WCdd2H7bZvQ7nSIIaGJvEhcBTrLTlayze30vVQ05tj6Jamu2kAMu6sbXb3+phFk5e9lamxgcw0sZ/lPu5eSAdgWT6UePGupiOlrvZ3aBd2H7BzWz1dKKqQmL3F6lqivIWVPBEXfR8Hwgxe/++7yCRZU4HJ7wqDujI9AC6IBjpi3nNUVMFOTvhyNkhpOo+b1G0t4MLjMLIJNDbaWBYRFV2SGwrYqA8Pvy5uCr7eBYohpnq2evYX1B9epeYZPeL6+b8ZgiYNFlzELynA+yg8xohxv109qFTIjkyVXHIU69tl2zpMSBdLxGFtjdj2zEEHBLz6700d9YNdUZtSIfgddgc=
```

**Checksum (MD5, uppercase):**
```
F5E50E9ECA3ABE655BCAF9A37FB292E2
```

---

## Requests for NIC-HP

### 1. **Encryption Specification Document**
Could you provide detailed encryption specifications including:
- Exact .NET RijndaelManaged configuration
- Block size, key size, padding mode
- Character encoding used (ASCII/UTF-8/Windows-1252)
- Checksum calculation method and format

### 2. **Sample Encrypted Payload**
Could you provide a working example with:
- Plain text string
- Encrypted Base64 output
- Checksum value
- Using our credentials (MERCHANT_CODE: HIMKOSH230, DEPT_ID: CTO00-068)

### 3. **Server-Side Decryption Trace**
Can you check server logs for our test transaction to see:
- What data HimKosh receives
- Where decryption fails
- Any specific error messages

### 4. **Test Environment Access**
Is there a test/sandbox HimKosh environment we can use for integration testing without affecting production?

---

## Technical Context

**Environment:** Node.js 20+ (not .NET)  
**Encryption Library:** Node.js native `crypto` module  
**Target Deployment:** On-premises HP Government data center  
**Timeline:** Integration needed for HP Tourism digital transformation project

---

## Contact Information

**Email:** [Your official email]  
**Phone:** [Your phone number]  
**Project:** HP Tourism Digital Ecosystem  
**Department:** CTO-068

---

## Attachment

We can provide:
- Complete encryption code implementation
- Server logs showing encryption process
- Test credentials for verification

Please advise on the best way to resolve this encryption compatibility issue.

Thank you for your assistance.
