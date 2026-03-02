# Sterling API v2 Reference

Documented from live testing against `https://api.us.int.sterlingcheck.app/v2` (integration/sandbox environment).

Account: MedSol (customer ID 27923, trading partner: OnDemandTP)

## POST /oauth

Client credentials flow. Basic auth header with base64-encoded `clientId:clientSecret`.

**Request:**
```
Content-Type: application/x-www-form-urlencoded
Authorization: Basic <base64(clientId:clientSecret)>
Body: grant_type=client_credentials
```

**Response (200):**
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": "3600"
}
```

Notes:
- `token_type` is lowercase `"bearer"` (not `"Bearer"`)
- `expires_in` is a **string**, not a number

## GET /packages

Returns a **top-level array** (not wrapped in an object).

**Response (200):**
```json
[
  {
    "id": "571732",
    "title": "Medical Solutions Package TEST",
    "active": true,
    "type": "Standard",
    "components": [
      "Drivers Record",
      "National Wants Warrants",
      "State Criminal Repository",
      "County Criminal Record",
      "SSN Trace",
      "HealthCare - Excluded Parties",
      "Criminal Enhanced Nationwide (7 year)",
      "FACISL",
      "DOJ Sex Offender Search"
    ],
    "products": [
      {
        "code": "CRST",
        "description": "State Criminal Repository",
        "variants": []
      },
      {
        "code": "EXOIG",
        "description": "HealthCare - Excluded Parties",
        "variants": [
          { "id": "3604", "root": "GSA", "description": "General Services Administration", "subtypes": [] }
        ]
      },
      {
        "code": "MSMJVII",
        "description": "Criminal Enhanced Nationwide (7 year)",
        "variants": []
      },
      {
        "code": "CRFM",
        "description": "County Criminal Record",
        "variants": []
      },
      {
        "code": "CRSEXDOJ",
        "description": "DOJ Sex Offender Search",
        "variants": []
      },
      {
        "code": "CRNW",
        "description": "National Wants Warrants",
        "variants": []
      },
      {
        "code": "SSV1",
        "description": "SSN Trace",
        "variants": []
      },
      {
        "code": "DR",
        "description": "Drivers Record",
        "variants": []
      },
      {
        "code": "FACISL",
        "description": "FACISL",
        "variants": [
          { "id": "5114", "root": "FACIS", "description": "L3", "subtypes": [] }
        ]
      }
    ],
    "requiredFields": [
      "address.addressLine",
      "address.countryCode",
      "address.municipality",
      "address.postalCode",
      "address.regionCode",
      "dob",
      "driversLicense.issuingAgency",
      "driversLicense.licenseNumber",
      "email",
      "familyName",
      "givenName",
      "ssn"
    ]
  },
  {
    "id": "587791",
    "title": "Medical Solution Package 0",
    "active": true,
    "type": "Standard",
    "components": ["SSN Trace"],
    "products": [
      { "code": "SSV1", "description": "SSN Trace", "variants": [] }
    ],
    "requiredFields": [
      "address.addressLine",
      "address.countryCode",
      "address.municipality",
      "address.postalCode",
      "address.regionCode",
      "dob",
      "familyName",
      "givenName",
      "ssn"
    ]
  }
]
```

Key field: `title` (not `name`). No `currentVersion` or `screenings` array.

Product codes: CRST, EXOIG, MSMJVII, CRFM, CRSEXDOJ, CRNW, SSV1, DR, FACISL

## POST /candidates

Creates a candidate record. Email and SSN must be unique across the account.

**Request:**
```json
{
  "givenName": "Test",
  "familyName": "Screening",
  "email": "unique@example.com",
  "clientReferenceId": "your-internal-id",
  "dob": "1990-05-15",
  "ssn": "999-88-7766",
  "address": {
    "addressLine": "123 Main St",
    "municipality": "Nashville",
    "regionCode": "US-TN",
    "postalCode": "37201",
    "countryCode": "US"
  },
  "driversLicense": {
    "type": "personal",
    "issuingAgency": "US-TN",
    "licenseNumber": "123456789"
  }
}
```

**Response (201):**
```json
{
  "id": "uuid-here",
  "clientReferenceId": "your-internal-id",
  "email": "unique@example.com",
  "givenName": "Test",
  "familyName": "Screening",
  "confirmedNoMiddleName": false,
  "dob": "1990-05-15",
  "ssn": "999-88-7766",
  "address": { "..." },
  "screeningIds": [],
  "driversLicense": {
    "type": "personal",
    "licenseNumber": "1XXXXXXX9",
    "issuingAgency": "US-TN"
  }
}
```

Notes:
- `regionCode` uses **ISO 3166-2** format: `"US-TN"` not `"TN"`
- `driversLicense.type` is **required** if driversLicense is provided (use `"personal"`)
- `id` is a UUID
- No `links` array in response
- `screeningIds` starts empty
- SSN is returned as-is (not masked in sandbox). License number IS masked.
- Email uniqueness enforced (409 if duplicate)
- SSN uniqueness enforced per active screening (400 if SSN has active order)

## POST /screenings

Initiates a screening against a candidate. Candidate must have all `requiredFields` from the package filled in.

**Request:**
```json
{
  "candidateId": "uuid-from-create-candidate",
  "packageId": "571732"
}
```

**Response (201):**
```json
{
  "id": "1806030372",
  "packageId": "571732",
  "packageName": "Medical Solutions Package TEST",
  "accountName": "Medical Solutions_Old",
  "candidateId": "uuid",
  "status": "Pending",
  "result": "Pending",
  "links": {
    "admin": {
      "web": "https://int.sterlingcheck.app/interactive-summary/#/order/..."
    }
  },
  "reportItems": [
    {
      "id": "23023325",
      "type": "SSN Trace",
      "status": "pending",
      "result": null,
      "updatedAt": "2026-02-23T09:49:00Z",
      "estimatedCompletionTime": "2026-02-23T09:49:00Z"
    },
    {
      "id": "23023326",
      "type": "Enhanced Nationwide Criminal Search (7 year)",
      "status": "pending",
      "result": null,
      "updatedAt": "2026-02-25T09:49:00Z",
      "estimatedCompletionTime": "2026-02-25T09:49:00Z"
    },
    {
      "id": "23023327",
      "type": "County Criminal Record",
      "status": "pending",
      "result": null,
      "root": "TN",
      "description": "DAVIDSON",
      "updatedAt": "2026-02-23T09:49:00Z",
      "estimatedCompletionTime": "2026-02-23T09:49:00Z"
    }
  ],
  "submittedAt": "2026-02-20T08:48:30Z",
  "updatedAt": "2026-03-03T09:49:00Z",
  "estimatedCompletionTime": "2026-03-03T09:49:00Z"
}
```

Notes:
- `id` is a **numeric string** (not UUID)
- `status` and `result` are title case: `"Pending"` not `"pending"`
- Components are in `reportItems` (not `screenings`)
- Each reportItem has: `id`, `type` (human-readable), `status` (lowercase), `result` (null or string), `updatedAt`, `estimatedCompletionTime`
- Some reportItems have `root` and `description` for jurisdiction
- `links.admin.web` provides the Sterling portal URL for this screening
- `packageName` and `accountName` are included

reportItem types observed:
- "SSN Trace"
- "Enhanced Nationwide Criminal Search (7 year)"
- "County Criminal Record"
- "State Criminal Repository"
- "Drivers Record"
- "OIG-Excluded Parties"
- "GSA-Excluded Parties"
- "FACIS L3"
- "DOJ Sex Offender Search"

## GET /screenings/:id

Returns same shape as POST /screenings response, plus `jobPosition` field.

**Response (200):**
Same as POST /screenings response, with additional field:
```json
{
  "jobPosition": "Medical Solutions Package TEST"
}
```

## POST /screenings/:id/report-links

Generates a shareable report link. Only works when screening is complete.

**Error (422) when not complete:**
```json
{
  "errors": [
    {
      "code": "422#not-yet-complete",
      "message": "The screening report cannot be shared until the report is complete"
    }
  ]
}
```

**GET is not supported** (returns 405).

## Error Format

All errors follow this shape:
```json
{
  "errors": [
    {
      "code": "400#field-name",
      "message": "Human readable error message"
    }
  ]
}
```

Common errors:
- `400#required-field` — Package requires a field on the candidate
- `400#ssn` — SSN already has active order
- `400#driversLicense.type` — Missing type when driversLicense provided
- `400#regionCode` — regionCode not in expected format (use ISO 3166-2: "US-XX")
- `409#email?already-in-use` — Duplicate email
- `422#not-yet-complete` — Report not ready yet
