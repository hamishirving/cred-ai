{
  "openapi": "3.1.0",
  "info": {
    "title": "Credentially Public API",
    "description": "Public API Proxy with Rate Limiting and Audit",
    "version": "2.0.0"
  },
  "servers": [
    {
      "url": "https://qa-eu-london.drfocused.com/gateway",
      "description": "Generated server url"
    }
  ],
  "tags": [
    {
      "name": "Documents",
      "description": "Document management proxy endpoints"
    },
    {
      "name": "Profiles",
      "description": "Profile management proxy endpoints"
    },
    {
      "name": "Compliance-packages",
      "description": "Profile's compliance packages management proxy endpoints"
    }
  ],
  "paths": {
    "/api/profile": {
      "get": {
        "tags": [
          "Profiles"
        ],
        "summary": "Load Profiles",
        "description": "Fetches a paginated list of profiles for the organisation.",
        "operationId": "loadProfiles",
        "parameters": [
          {
            "name": "page",
            "in": "query",
            "required": false,
            "schema": {
              "type": "integer",
              "format": "int32",
              "default": 0
            }
          },
          {
            "name": "size",
            "in": "query",
            "required": false,
            "schema": {
              "type": "integer",
              "format": "int32",
              "default": 20
            }
          },
          {
            "name": "name",
            "in": "query",
            "description": "Smart search of first name, last name and email",
            "required": false,
            "schema": {
              "type": "string",
              "description": "Smart search of first name, last name and email"
            }
          },
          {
            "name": "complianceStatus",
            "in": "query",
            "description": "Compliance status",
            "required": false,
            "schema": {
              "type": "string",
              "description": "Compliance status",
              "enum": [
                "COMPLIANT",
                "NOT_COMPLIANT"
              ]
            }
          },
          {
            "name": "complianceTag",
            "in": "query",
            "required": false,
            "schema": {
              "type": "array",
              "description": "Compliance tags",
              "example": [
                "REFERENCE_AWAITING_APPROVAL",
                "REFERENCE_BOUNCED",
                "REFERENCE_NOT_ENOUGH",
                "DOCUMENTS_DECLINED",
                "DOCUMENTS_AWAITING_APPROVAL",
                "DOCUMENTS_MISSING"
              ],
              "items": {
                "type": "string"
              }
            }
          },
          {
            "name": "groups",
            "in": "query",
            "required": false,
            "schema": {
              "type": "array",
              "description": "Groups",
              "example": [
                "group01-public-id",
                "group02-public-id",
                "group03-public-id"
              ],
              "items": {
                "type": "string"
              }
            }
          },
          {
            "name": "jobPositionStatus",
            "in": "query",
            "required": false,
            "schema": {
              "type": "array",
              "items": {
                "type": "string",
                "description": "Job position status",
                "enum": [
                  "ACTIVE",
                  "INVITED",
                  "IMPORTED",
                  "ARCHIVED"
                ]
              }
            }
          },
          {
            "name": "X-API-Version",
            "in": "header",
            "schema": {
              "type": "string",
              "default": "2.0.0",
              "enum": [
                "2.0.0"
              ]
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Profiles loaded",
            "content": {
              "*/*": {
                "schema": {
                  "$ref": "#/components/schemas/ProfileListPageDto"
                }
              }
            }
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearer-key": []
          }
        ]
      },
      "put": {
        "tags": [
          "Profiles"
        ],
        "summary": "Create Profile",
        "description": "Creates a new profile and optionally populates custom fields in a single transaction.",
        "operationId": "createProfile",
        "parameters": [
          {
            "name": "X-API-Version",
            "in": "header",
            "schema": {
              "type": "string",
              "default": "2.0.0",
              "enum": [
                "2.0.0"
              ]
            }
          }
        ],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CreateProfileRequestDto"
              }
            }
          },
          "required": true
        },
        "responses": {
          "201": {
            "description": "Profile created successfully",
            "content": {
              "*/*": {
                "schema": {
                  "$ref": "#/components/schemas/CreateProfileResponseDto"
                }
              }
            }
          },
          "400": {
            "description": "Invalid request data (e.g. invalid role)"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearer-key": []
          }
        ]
      },
      "patch": {
        "tags": [
          "Profiles"
        ],
        "summary": "Update Profile Fields",
        "description": "Updates custom fields for an existing profile identified by email.",
        "operationId": "updateProfileFields",
        "parameters": [
          {
            "name": "X-API-Version",
            "in": "header",
            "schema": {
              "type": "string",
              "default": "2.0.0",
              "enum": [
                "2.0.0"
              ]
            }
          }
        ],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/UpdateProfileFieldsRequestDto"
              }
            }
          },
          "required": true
        },
        "responses": {
          "200": {
            "description": "Fields updated successfully",
            "content": {
              "*/*": {
                "schema": {
                  "$ref": "#/components/schemas/CreateProfileResponseDto"
                }
              }
            }
          },
          "404": {
            "description": "Profile not found for email"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearer-key": []
          }
        ]
      }
    },
    "/api/documents/{profileId}": {
      "get": {
        "tags": [
          "Documents"
        ],
        "summary": "Get Profile Documents",
        "description": "Fetches documents for a profile, enriched with extra OCR fields.",
        "operationId": "getDocuments",
        "parameters": [
          {
            "name": "profileId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "X-API-Version",
            "in": "header",
            "schema": {
              "type": "string",
              "default": "2.0.0",
              "enum": [
                "2.0.0"
              ]
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Documents retrieved successfully",
            "content": {
              "*/*": {
                "schema": {
                  "type": "array",
                  "items": {
                    "$ref": "#/components/schemas/DocumentDto"
                  }
                }
              }
            }
          },
          "404": {
            "description": "Documents or profile not found"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearer-key": []
          }
        ]
      },
      "put": {
        "tags": [
          "Documents"
        ],
        "summary": "Upload Profile Document",
        "description": "Uploads a document for a specific profile and triggers processing.",
        "operationId": "uploadDocument",
        "parameters": [
          {
            "name": "profileId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "X-API-Version",
            "in": "header",
            "schema": {
              "type": "string",
              "default": "2.0.0",
              "enum": [
                "2.0.0"
              ]
            }
          }
        ],
        "requestBody": {
          "content": {
            "multipart/form-data": {
              "schema": {
                "type": "object",
                "properties": {
                  "data": {
                    "$ref": "#/components/schemas/DocumentUploadRequest"
                  },
                  "file": {
                    "type": "string",
                    "format": "binary"
                  }
                },
                "required": [
                  "data",
                  "file"
                ]
              },
              "encoding": {
                "data": {
                  "contentType": "application/json"
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Document uploaded and processing started"
          },
          "400": {
            "description": "Invalid request data"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearer-key": []
          }
        ]
      }
    },
    "/api/compliance-packages/{profileId}": {
      "get": {
        "tags": [
          "Compliance-packages"
        ],
        "summary": "Get all profile's compliance packages",
        "description": "Fetches a list of all compliance requirements for all assigned packages for the profile.",
        "operationId": "getProfileCompliancePackages",
        "parameters": [
          {
            "name": "profileId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "X-API-Version",
            "in": "header",
            "schema": {
              "type": "string",
              "default": "2.0.0",
              "enum": [
                "2.0.0"
              ]
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Compliance packages retrieved successfully",
            "content": {
              "*/*": {
                "schema": {
                  "type": "array",
                  "items": {
                    "$ref": "#/components/schemas/CompliancePackageDto"
                  }
                }
              }
            }
          },
          "404": {
            "description": "Compliance packages or profile not found"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearer-key": []
          }
        ]
      },
      "post": {
        "tags": [
          "Compliance-packages"
        ],
        "summary": "Assign compliance packages to profile",
        "description": "Assign compliance packages (list of their ids) to profile.",
        "operationId": "assign",
        "parameters": [
          {
            "name": "profileId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "X-API-Version",
            "in": "header",
            "schema": {
              "type": "string",
              "default": "2.0.0",
              "enum": [
                "2.0.0"
              ]
            }
          }
        ],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "type": "array",
                "items": {
                  "type": "string"
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "200": {
            "description": "Compliance packages were assigned successfully",
            "content": {
              "*/*": {
                "schema": {
                  "type": "array",
                  "items": {
                    "$ref": "#/components/schemas/CompliancePackageDto"
                  }
                }
              }
            }
          },
          "404": {
            "description": "Compliance packages or profile not found"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearer-key": []
          }
        ]
      }
    },
    "/api/documents/reject": {
      "patch": {
        "tags": [
          "Documents"
        ],
        "summary": "Reject document of file.",
        "description": "Decline specific document and file.",
        "operationId": "reject",
        "parameters": [
          {
            "name": "X-API-Version",
            "in": "header",
            "schema": {
              "type": "string",
              "default": "2.0.0",
              "enum": [
                "2.0.0"
              ]
            }
          }
        ],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/FileRequest"
              },
              "encoding": {
                "note": {
                  "contentType": "application/json"
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "200": {
            "description": "Document declined successfully"
          },
          "400": {
            "description": "Bad request, e.g. 'VerifierPublicId not found'"
          },
          "404": {
            "description": "Document or file not found"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearer-key": []
          }
        ]
      }
    },
    "/api/documents/approve": {
      "patch": {
        "tags": [
          "Documents"
        ],
        "summary": "Approve document of file.",
        "description": "Approve specific document and file.",
        "operationId": "approve",
        "parameters": [
          {
            "name": "X-API-Version",
            "in": "header",
            "schema": {
              "type": "string",
              "default": "2.0.0",
              "enum": [
                "2.0.0"
              ]
            }
          }
        ],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/FileRequest"
              },
              "encoding": {
                "note": {
                  "contentType": "application/json"
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "200": {
            "description": "Document approved successfully"
          },
          "400": {
            "description": "Bad request, e.g. 'VerifierPublicId not found'"
          },
          "404": {
            "description": "Document or file not found"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearer-key": []
          }
        ]
      }
    },
    "/api/profile/{profileId}": {
      "get": {
        "tags": [
          "Profiles"
        ],
        "summary": "Get Profile by ID",
        "description": "Fetches detailed profile information for a profile by their ID, including enriched custom fields.",
        "operationId": "getProfileById",
        "parameters": [
          {
            "name": "profileId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "X-API-Version",
            "in": "header",
            "schema": {
              "type": "string",
              "default": "2.0.0",
              "enum": [
                "2.0.0"
              ]
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Profile found",
            "content": {
              "*/*": {
                "schema": {
                  "$ref": "#/components/schemas/ProfileDto"
                }
              }
            }
          },
          "404": {
            "description": "Profile not found"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearer-key": []
          }
        ]
      }
    },
    "/api/profile/metadata": {
      "get": {
        "tags": [
          "Profiles"
        ],
        "summary": "Get Profile Metadata",
        "description": "Fetches and aggregates profile metadata fields (schema) and available roles for the organisation.",
        "operationId": "getProfileMetadata",
        "parameters": [
          {
            "name": "X-API-Version",
            "in": "header",
            "schema": {
              "type": "string",
              "default": "2.0.0",
              "enum": [
                "2.0.0"
              ]
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Metadata retrieved successfully",
            "content": {
              "*/*": {
                "schema": {
                  "$ref": "#/components/schemas/OrganisationMetadataDto"
                }
              }
            }
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearer-key": []
          }
        ]
      }
    },
    "/api/profile/find": {
      "get": {
        "tags": [
          "Profiles"
        ],
        "summary": "Get Profile by Email",
        "description": "Fetches detailed profile information, including enriched custom fields.",
        "operationId": "getProfileByEmail",
        "parameters": [
          {
            "name": "email",
            "in": "query",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "X-API-Version",
            "in": "header",
            "schema": {
              "type": "string",
              "default": "2.0.0",
              "enum": [
                "2.0.0"
              ]
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Profile found",
            "content": {
              "*/*": {
                "schema": {
                  "$ref": "#/components/schemas/ProfileDto"
                }
              }
            }
          },
          "404": {
            "description": "Profile not found"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearer-key": []
          }
        ]
      }
    },
    "/api/profile/all": {
      "get": {
        "tags": [
          "Profiles"
        ],
        "summary": "List All Profiles (Lightweight)",
        "description": "Fetches a non-paginated list of all profiles for the organisation with lightweight information.",
        "operationId": "loadAllProfiles",
        "parameters": [
          {
            "name": "X-API-Version",
            "in": "header",
            "schema": {
              "type": "string",
              "default": "2.0.0",
              "enum": [
                "2.0.0"
              ]
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Profiles loaded",
            "content": {
              "*/*": {
                "schema": {
                  "type": "array",
                  "items": {
                    "$ref": "#/components/schemas/ProfileLightDto"
                  }
                }
              }
            }
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearer-key": []
          }
        ]
      }
    },
    "/api/documents/download": {
      "get": {
        "tags": [
          "Documents"
        ],
        "summary": "Download file by its id",
        "description": "Download file by its id.",
        "operationId": "downloadFile",
        "parameters": [
          {
            "name": "fileId",
            "in": "query",
            "required": true,
            "schema": {
              "type": "integer",
              "format": "int64"
            }
          },
          {
            "name": "X-API-Version",
            "in": "header",
            "schema": {
              "type": "string",
              "default": "2.0.0",
              "enum": [
                "2.0.0"
              ]
            }
          }
        ],
        "responses": {
          "200": {
            "description": "File downloaded successfully",
            "content": {
              "*/*": {
                "schema": {
                  "type": "string",
                  "format": "binary"
                }
              }
            }
          },
          "500": {
            "description": "File not found"
          }
        },
        "security": [
          {
            "bearer-key": []
          }
        ]
      }
    },
    "/api/documents/document-types": {
      "get": {
        "tags": [
          "Documents"
        ],
        "summary": "Get Organisation Document Types",
        "description": "Fetches document types for an organisation.",
        "operationId": "getDocumentTypes",
        "parameters": [
          {
            "name": "X-API-Version",
            "in": "header",
            "schema": {
              "type": "string",
              "default": "2.0.0",
              "enum": [
                "2.0.0"
              ]
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Document types retrieved successfully",
            "content": {
              "*/*": {
                "schema": {
                  "type": "array",
                  "items": {
                    "$ref": "#/components/schemas/OrganisationDocumentTypeDto"
                  }
                }
              }
            }
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearer-key": []
          }
        ]
      }
    },
    "/api/compliance-packages": {
      "get": {
        "tags": [
          "Compliance-packages"
        ],
        "summary": "Get all organisation's compliance packages",
        "description": "Fetches a list of all organisation's compliance packages.",
        "operationId": "getOrganisationCompliancePackages",
        "parameters": [
          {
            "name": "X-API-Version",
            "in": "header",
            "schema": {
              "type": "string",
              "default": "2.0.0",
              "enum": [
                "2.0.0"
              ]
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Compliance packages retrieved successfully",
            "content": {
              "*/*": {
                "schema": {
                  "type": "array",
                  "items": {
                    "$ref": "#/components/schemas/CompliancePackageBasicDto"
                  }
                }
              }
            }
          },
          "404": {
            "description": "Compliance packages not found"
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "security": [
          {
            "bearer-key": []
          }
        ]
      }
    }
  },
  "components": {
    "schemas": {
      "CreateProfileRequestDto": {
        "type": "object",
        "properties": {
          "email": {
            "type": "string"
          },
          "roleName": {
            "type": "string"
          },
          "firstName": {
            "type": "string"
          },
          "lastName": {
            "type": "string"
          },
          "birthDate": {
            "type": "string",
            "format": "date"
          },
          "registrationNumber": {
            "type": "string"
          },
          "phone": {
            "type": "string"
          },
          "skipOnboarding": {
            "type": "boolean"
          },
          "sendInviteEmail": {
            "type": "boolean"
          },
          "fields": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/CustomFieldInputDto"
            }
          }
        }
      },
      "CustomFieldInputDto": {
        "type": "object",
        "properties": {
          "fieldName": {
            "type": "string"
          },
          "value": {

          }
        }
      },
      "ChecklistAssignmentDto": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "status": {
            "type": "string"
          },
          "type": {
            "type": "string"
          }
        }
      },
      "ComplianceTagDto": {
        "type": "object",
        "properties": {
          "key": {
            "type": "string"
          },
          "group": {
            "type": "string",
            "enum": [
              "COMPLIANCE_ERROR",
              "COMPLIANCE_OK"
            ]
          }
        }
      },
      "CreateProfileResponseDto": {
        "type": "object",
        "properties": {
          "customFieldUpdateResult": {
            "type": "string"
          },
          "profileDto": {
            "$ref": "#/components/schemas/ProfileDto"
          }
        }
      },
      "CustomFieldDto": {
        "type": "object",
        "properties": {
          "shortName": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "value": {

          }
        }
      },
      "GradeDto": {
        "type": "object",
        "properties": {
          "code": {
            "type": "string"
          },
          "name": {
            "type": "string"
          }
        }
      },
      "JobPositionDto": {
        "type": "object",
        "properties": {
          "id": {
            "type": "integer",
            "format": "int64"
          },
          "status": {
            "type": "string"
          },
          "archivedDateTime": {
            "type": "string"
          },
          "startDate": {
            "type": "string"
          },
          "trialEndDate": {
            "type": "string"
          },
          "endDate": {
            "type": "string"
          },
          "signedOff": {
            "type": "boolean"
          },
          "skipOnboarding": {
            "type": "boolean"
          },
          "workSiteId": {
            "type": "integer",
            "format": "int64"
          },
          "role": {
            "$ref": "#/components/schemas/RoleDto"
          },
          "complianceStatus": {
            "type": "string"
          },
          "complianceStatusTags": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/ComplianceTagDto"
            },
            "uniqueItems": true
          }
        }
      },
      "ProfileDto": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "firstName": {
            "type": "string"
          },
          "lastName": {
            "type": "string"
          },
          "title": {
            "$ref": "#/components/schemas/UserTitleDto"
          },
          "gender": {
            "type": "string"
          },
          "birthDate": {
            "type": "string",
            "format": "date"
          },
          "gradeName": {
            "$ref": "#/components/schemas/GradeDto"
          },
          "otherGrade": {
            "type": "string"
          },
          "medicalCategory": {
            "type": "string"
          },
          "medicalSpecialty": {
            "type": "string"
          },
          "personnelType": {
            "$ref": "#/components/schemas/RoleExtendedDto"
          },
          "jobs": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/JobPositionDto"
            },
            "uniqueItems": true
          },
          "complianceStatus": {
            "type": "string"
          },
          "email": {
            "type": "string"
          },
          "complianceStatusTags": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/ComplianceTagDto"
            },
            "uniqueItems": true
          },
          "checklists": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/ChecklistAssignmentDto"
            },
            "uniqueItems": true
          },
          "customProfileFields": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/CustomFieldDto"
            }
          }
        }
      },
      "RoleDto": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          }
        }
      },
      "RoleExtendedDto": {
        "type": "object",
        "properties": {
          "id": {
            "type": "integer",
            "format": "int64"
          },
          "name": {
            "type": "string"
          },
          "description": {
            "type": "string"
          },
          "staffType": {
            "type": "string"
          },
          "reserved": {
            "type": "boolean"
          },
          "accessTags": {
            "type": "array",
            "items": {
              "type": "string"
            }
          }
        }
      },
      "UserTitleDto": {
        "type": "object",
        "properties": {
          "key": {
            "type": "string"
          },
          "defaultValue": {
            "type": "string"
          }
        }
      },
      "DocumentUploadRequest": {
        "type": "object",
        "description": "Request body for uploading a document.",
        "properties": {
          "uploaderId": {
            "type": "string",
            "description": "Mandatory profile ID of the uploader",
            "minLength": 1
          },
          "documentTypeKey": {
            "type": "string"
          },
          "otherDocumentTypeName": {
            "type": "string"
          },
          "skipDuplicates": {
            "type": "boolean"
          }
        },
        "required": [
          "uploaderId"
        ]
      },
      "CheckIntegrationDto": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string"
          },
          "type": {
            "type": "string"
          }
        }
      },
      "CompliancePackageDto": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "modified": {
            "type": "boolean"
          },
          "groups": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/EmployeeComplianceGroupDto"
            }
          }
        }
      },
      "DocumentTypeBaseDto": {
        "type": "object",
        "properties": {
          "id": {
            "type": "integer",
            "format": "int64"
          },
          "name": {
            "type": "string"
          },
          "description": {
            "type": "string"
          },
          "key": {
            "type": "string"
          }
        }
      },
      "EmployeeBasicDto": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "firstName": {
            "type": "string"
          },
          "lastName": {
            "type": "string"
          },
          "smallAvatarUrl": {
            "type": "string"
          }
        }
      },
      "EmployeeComplianceGroupDto": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "requirements": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/EmployeeComplianceRequirementDto"
            }
          }
        }
      },
      "EmployeeComplianceRequirementDto": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "type": {
            "type": "string",
            "enum": [
              "DOCUMENT_TYPE",
              "INTEGRATION",
              "REFERENCE_FORM",
              "TEXT_REQUIREMENT"
            ]
          },
          "complianceStatus": {
            "type": "string",
            "enum": [
              "COMPLIANT",
              "NOT_COMPLIANT"
            ]
          },
          "complianceTags": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/ComplianceTagDto"
            },
            "uniqueItems": true
          },
          "documentType": {
            "$ref": "#/components/schemas/DocumentTypeBaseDto"
          },
          "referenceForm": {
            "$ref": "#/components/schemas/ReferenceFormBaseDto"
          },
          "requiredReferencesNumber": {
            "type": "integer",
            "format": "int32"
          },
          "integration": {
            "$ref": "#/components/schemas/CheckIntegrationDto"
          },
          "textRequirement": {
            "$ref": "#/components/schemas/TextRequirementShortDto"
          },
          "approved": {
            "type": "string",
            "format": "date-time"
          },
          "approvedBy": {
            "$ref": "#/components/schemas/EmployeeBasicDto"
          }
        }
      },
      "ReferenceFormBaseDto": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "title": {
            "type": "string"
          },
          "businessRules": {
            "type": "string"
          },
          "phoneRequired": {
            "type": "boolean"
          },
          "prohibitPersonalEmails": {
            "type": "boolean"
          },
          "expired": {
            "type": "boolean"
          }
        }
      },
      "TextRequirementShortDto": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          }
        }
      },
      "UpdateProfileFieldsRequestDto": {
        "type": "object",
        "properties": {
          "email": {
            "type": "string"
          },
          "fields": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/CustomFieldInputDto"
            }
          }
        }
      },
      "FileRequest": {
        "type": "object",
        "description": "Request body for approving/declining a file.\n'documentPublicId', 'fileId' and 'organisationId' are mandatory; 'note' is mandatory only for rejecting.\n",
        "properties": {
          "documentPublicId": {
            "type": "string"
          },
          "fileId": {
            "type": "integer",
            "format": "int64"
          },
          "organisationId": {
            "type": "integer",
            "format": "int64"
          },
          "note": {
            "type": "string"
          },
          "verifierPublicId": {
            "type": "string",
            "description": "The public Id from the profile that will be marked as the verifier on approval.\nThis field is required when the session token is from a public-api (server-to-server).\nIn other cases this parameter is not required and even ignored to use the id from the user in session.\n"
          }
        }
      },
      "OrganisationMetadataDto": {
        "type": "object",
        "properties": {
          "profileFields": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/ProfileMetadataResultDto"
            }
          },
          "roles": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/OrganisationRoleDto"
            }
          }
        }
      },
      "OrganisationRoleDto": {
        "type": "object",
        "properties": {
          "id": {
            "type": "integer",
            "format": "int64"
          },
          "name": {
            "type": "string"
          },
          "description": {
            "type": "string"
          },
          "staffType": {
            "type": "string"
          },
          "reserved": {
            "type": "boolean"
          },
          "accessTags": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "employeesCount": {
            "type": "integer",
            "format": "int32"
          },
          "signUpAllowed": {
            "type": "boolean"
          }
        }
      },
      "ProfileMetadataResultDto": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string"
          },
          "jsonSchema": {
            "type": "object",
            "additionalProperties": {

            }
          }
        }
      },
      "ProfileLightDto": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "email": {
            "type": "string"
          },
          "firstName": {
            "type": "string"
          },
          "lastName": {
            "type": "string"
          },
          "complianceStatus": {
            "type": "string"
          }
        }
      },
      "ProfileListPageDto": {
        "type": "object",
        "properties": {
          "content": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/ProfileDto"
            }
          },
          "totalPages": {
            "type": "integer",
            "format": "int32"
          },
          "totalElements": {
            "type": "integer",
            "format": "int64"
          },
          "size": {
            "type": "integer",
            "format": "int32"
          },
          "number": {
            "type": "integer",
            "format": "int32"
          }
        }
      },
      "ActiveFileDto": {
        "type": "object",
        "properties": {
          "id": {
            "type": "integer",
            "format": "int64"
          },
          "publicId": {
            "type": "string"
          },
          "extraOcrFields": {
            "type": "object",
            "additionalProperties": {

            }
          },
          "issued": {
            "type": "string",
            "format": "date"
          },
          "expiry": {
            "type": "string",
            "format": "date"
          },
          "monthToExpire": {
            "type": "integer",
            "format": "int32"
          },
          "daysToExpire": {
            "type": "integer",
            "format": "int32"
          },
          "created": {
            "type": "string",
            "format": "date-time"
          },
          "issuesReason": {
            "type": "string"
          },
          "verifications": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/VerificationDto"
            }
          },
          "actualVerificationStatuses": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/VerificationStatusDto"
            }
          },
          "statusType": {
            "type": "string"
          },
          "uploader": {
            "$ref": "#/components/schemas/UserSummaryDto"
          }
        }
      },
      "DocumentDto": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "description": {
            "type": "string"
          },
          "type": {
            "$ref": "#/components/schemas/DocumentTypeDto"
          },
          "otherTypeName": {
            "type": "string"
          },
          "profileId": {
            "type": "string"
          },
          "versions": {
            "type": "integer",
            "format": "int32"
          },
          "activeFile": {
            "$ref": "#/components/schemas/ActiveFileDto"
          },
          "statusType": {
            "type": "string"
          }
        }
      },
      "DocumentTypeDto": {
        "type": "object",
        "properties": {
          "id": {
            "type": "integer",
            "format": "int64"
          },
          "name": {
            "type": "string"
          },
          "description": {
            "type": "string"
          },
          "key": {
            "type": "string"
          },
          "shortName": {
            "type": "string"
          },
          "ocrModelCode": {
            "type": "string"
          },
          "ocrModelName": {
            "type": "string"
          },
          "expiryPeriodInMonths": {
            "type": "integer",
            "format": "int32"
          },
          "expireSoonPeriodInDays": {
            "type": "integer",
            "format": "int32"
          },
          "category": {
            "type": "string"
          },
          "reminderText": {
            "type": "string"
          },
          "ocrSupported": {
            "type": "boolean"
          },
          "common": {
            "type": "boolean"
          },
          "profileOwnerRestricted": {
            "type": "boolean"
          },
          "ocrModel": {
            "type": "object",
            "additionalProperties": {

            },
            "writeOnly": true
          }
        }
      },
      "UserSummaryDto": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "firstName": {
            "type": "string"
          },
          "lastName": {
            "type": "string"
          },
          "smallAvatarUrl": {
            "type": "string"
          },
          "roleName": {
            "type": "string"
          },
          "active": {
            "type": "boolean"
          }
        }
      },
      "VerificationDto": {
        "type": "object",
        "properties": {
          "verificationType": {
            "type": "string"
          },
          "note": {
            "type": "string"
          },
          "created": {
            "type": "string",
            "format": "date-time"
          },
          "verifier": {
            "$ref": "#/components/schemas/UserSummaryDto"
          }
        }
      },
      "VerificationStatusDto": {
        "type": "object",
        "properties": {
          "status": {
            "type": "string"
          },
          "verifier": {
            "$ref": "#/components/schemas/UserSummaryDto"
          },
          "approvalRole": {
            "type": "string"
          },
          "verifiedDate": {
            "type": "string",
            "format": "date-time"
          }
        }
      },
      "BaseRoleDto": {
        "type": "object",
        "properties": {
          "roleId": {
            "type": "integer",
            "format": "int64"
          },
          "roleName": {
            "type": "string"
          }
        }
      },
      "OrganisationDocumentTypeDto": {
        "type": "object",
        "properties": {
          "id": {
            "type": "integer",
            "format": "int64"
          },
          "name": {
            "type": "string"
          },
          "description": {
            "type": "string"
          },
          "key": {
            "type": "string"
          },
          "shortName": {
            "type": "string"
          },
          "ocrModelCode": {
            "type": "string"
          },
          "ocrModelName": {
            "type": "string"
          },
          "expiryPeriodInMonths": {
            "type": "integer",
            "format": "int32"
          },
          "expireSoonPeriodInDays": {
            "type": "integer",
            "format": "int32"
          },
          "category": {
            "type": "string"
          },
          "reminderText": {
            "type": "string"
          },
          "ocrSupported": {
            "type": "boolean"
          },
          "common": {
            "type": "boolean"
          },
          "profileOwnerRestricted": {
            "type": "boolean"
          },
          "createdBy": {
            "type": "string"
          },
          "restrictAccessRoles": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/BaseRoleDto"
            }
          },
          "approvalRoles": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/BaseRoleDto"
            }
          },
          "ocrModel": {
            "type": "object",
            "additionalProperties": {

            },
            "writeOnly": true
          }
        }
      },
      "CompliancePackageBasicDto": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "roles": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/BaseRoleDto"
            }
          },
          "totalRequirements": {
            "type": "integer",
            "format": "int32"
          },
          "updated": {
            "type": "string",
            "format": "date-time"
          },
          "compliantAssignmentCount": {
            "type": "integer",
            "format": "int64"
          },
          "totalAssignmentCount": {
            "type": "integer",
            "format": "int64"
          },
          "totalAllAssignmentCount": {
            "type": "integer",
            "format": "int64"
          },
          "updateInProgress": {
            "type": "boolean"
          }
        }
      }
    },
    "securitySchemes": {
      "bearer-key": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT"
      }
    }
  }
}