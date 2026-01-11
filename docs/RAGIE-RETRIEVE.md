Retrieve

# Retrieve

# OpenAPI definition

```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "Ragie API",
    "version": "1.0.0"
  },
  "servers": [
    {
      "url": "https://api.ragie.ai"
    }
  ],
  "paths": {
    "/retrievals": {
      "post": {
        "tags": [
          "retrievals"
        ],
        "summary": "Retrieve",
        "operationId": "Retrieve",
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "properties": {
                  "query": {
                    "type": "string",
                    "title": "Query",
                    "description": "The query to search with when retrieving document chunks.",
                    "examples": [
                      "What is the best pizza place in SF?"
                    ]
                  },
                  "top_k": {
                    "type": "integer",
                    "title": "Top K",
                    "description": "The maximum number of chunks to return. Defaults to 8.",
                    "default": 8,
                    "examples": [
                      8
                    ]
                  },
                  "filter": {
                    "title": "Filter",
                    "description": "The metadata search filter on documents. Returns chunks only from documents which match the filter. The following filter operators are supported: $eq - Equal to (number, string, boolean), $ne - Not equal to (number, string, boolean), $gt - Greater than (number), $gte - Greater than or equal to (number), $lt - Less than (number), $lte - Less than or equal to (number), $in - In array (string or number), $nin - Not in array (string or number). The operators can be combined with AND and OR. Read [Metadata & Filters guide](https://docs.ragie.ai/docs/metadata-filters) for more details and examples.",
                    "examples": [
                      {
                        "department": {
                          "$in": [
                            "sales",
                            "marketing"
                          ]
                        }
                      }
                    ],
                    "additionalProperties": true,
                    "type": "object",
                    "x-readme-ref-name": "MetadataFilter"
                  },
                  "rerank": {
                    "type": "boolean",
                    "title": "Rerank",
                    "description": "Reranks the chunks for semantic relevancy post cosine similarity. Will be slower but returns a subset of highly relevant chunks. Best for reducing hallucinations and improving accuracy for LLM generation.",
                    "default": false,
                    "examples": [
                      true
                    ]
                  },
                  "max_chunks_per_document": {
                    "type": "integer",
                    "title": "Max Chunks Per Document",
                    "description": "Maximum number of chunks to retrieve per document. Use this to increase the number of documents the final chunks are retrieved from. This feature is in beta and may change in the future.",
                    "examples": [
                      0
                    ]
                  },
                  "partition": {
                    "type": "string",
                    "title": "Partition",
                    "description": "The partition to scope a retrieval to. If omitted, the retrieval will be scoped to the default partition, which includes any documents that have not been created in a partition.",
                    "examples": [
                      null
                    ]
                  },
                  "recency_bias": {
                    "type": "boolean",
                    "title": "Recency Bias",
                    "description": "Enables recency bias which will favor more recent documents vs older documents. https://docs.ragie.ai/docs/retrievals-recency-bias",
                    "default": false,
                    "examples": [
                      false
                    ]
                  }
                },
                "type": "object",
                "required": [
                  "query"
                ],
                "title": "RetrieveParams",
                "x-readme-ref-name": "RetrieveParams"
              }
            }
          },
          "required": true
        },
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {
                  "properties": {
                    "scored_chunks": {
                      "items": {
                        "properties": {
                          "text": {
                            "type": "string",
                            "title": "Text"
                          },
                          "score": {
                            "type": "number",
                            "title": "Score"
                          },
                          "id": {
                            "type": "string",
                            "title": "Id"
                          },
                          "index": {
                            "type": "integer",
                            "title": "Index"
                          },
                          "metadata": {
                            "default": {},
                            "properties": {},
                            "additionalProperties": true,
                            "type": "object",
                            "title": "ChunkMetadata",
                            "x-readme-ref-name": "ChunkMetadata"
                          },
                          "document_id": {
                            "type": "string",
                            "title": "Document Id"
                          },
                          "document_name": {
                            "type": "string",
                            "title": "Document Name"
                          },
                          "document_metadata": {
                            "properties": {},
                            "additionalProperties": true,
                            "type": "object",
                            "title": "DocumentMetadata",
                            "x-readme-ref-name": "DocumentMetadata"
                          },
                          "links": {
                            "additionalProperties": {
                              "properties": {
                                "href": {
                                  "type": "string",
                                  "title": "Href"
                                },
                                "type": {
                                  "type": "string",
                                  "title": "Type"
                                }
                              },
                              "type": "object",
                              "required": [
                                "href",
                                "type"
                              ],
                              "title": "Link",
                              "x-readme-ref-name": "Link"
                            },
                            "type": "object",
                            "title": "Links"
                          }
                        },
                        "type": "object",
                        "required": [
                          "text",
                          "score",
                          "id",
                          "index",
                          "document_id",
                          "document_name",
                          "document_metadata",
                          "links"
                        ],
                        "title": "ScoredChunk",
                        "x-readme-ref-name": "ScoredChunk"
                      },
                      "type": "array",
                      "title": "Scored Chunks"
                    }
                  },
                  "type": "object",
                  "required": [
                    "scored_chunks"
                  ],
                  "title": "Retrieval",
                  "x-readme-ref-name": "Retrieval"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized",
            "content": {
              "application/json": {
                "schema": {
                  "properties": {
                    "detail": {
                      "type": "string",
                      "title": "Detail"
                    }
                  },
                  "type": "object",
                  "required": [
                    "detail"
                  ],
                  "title": "ErrorMessage",
                  "x-readme-ref-name": "ErrorMessage"
                }
              }
            }
          },
          "402": {
            "description": "Payment Required",
            "content": {
              "application/json": {
                "schema": {
                  "properties": {
                    "detail": {
                      "type": "string",
                      "title": "Detail"
                    }
                  },
                  "type": "object",
                  "required": [
                    "detail"
                  ],
                  "title": "ErrorMessage",
                  "x-readme-ref-name": "ErrorMessage"
                }
              }
            }
          },
          "422": {
            "description": "Validation Error",
            "content": {
              "application/json": {
                "schema": {
                  "properties": {
                    "detail": {
                      "items": {
                        "properties": {
                          "loc": {
                            "items": {
                              "anyOf": [
                                {
                                  "type": "string"
                                },
                                {
                                  "type": "integer"
                                }
                              ]
                            },
                            "type": "array",
                            "title": "Location"
                          },
                          "msg": {
                            "type": "string",
                            "title": "Message"
                          },
                          "type": {
                            "type": "string",
                            "title": "Error Type"
                          }
                        },
                        "type": "object",
                        "required": [
                          "loc",
                          "msg",
                          "type"
                        ],
                        "title": "ValidationError",
                        "x-readme-ref-name": "ValidationError"
                      },
                      "type": "array",
                      "title": "Detail"
                    }
                  },
                  "type": "object",
                  "title": "HTTPValidationError",
                  "x-readme-ref-name": "HTTPValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too Many Requests",
            "content": {
              "application/json": {
                "schema": {
                  "properties": {
                    "detail": {
                      "type": "string",
                      "title": "Detail"
                    }
                  },
                  "type": "object",
                  "required": [
                    "detail"
                  ],
                  "title": "ErrorMessage",
                  "x-readme-ref-name": "ErrorMessage"
                }
              }
            }
          },
          "500": {
            "description": "Internal Server Error",
            "content": {
              "application/json": {
                "schema": {
                  "properties": {
                    "detail": {
                      "type": "string",
                      "title": "Detail"
                    }
                  },
                  "type": "object",
                  "required": [
                    "detail"
                  ],
                  "title": "ErrorMessage",
                  "x-readme-ref-name": "ErrorMessage"
                }
              }
            }
          }
        },
        "security": [
          {
            "auth": []
          }
        ],
        "x-speakeasy-name-override": "retrieve"
      }
    }
  },
  "webhooks": {
    "event": {
      "post": {
        "summary": "Event",
        "description": "When events occur in Ragie such as a document being processed, we'll send this data to URLs that you can register in app. Learn more about webhooks in our docs: https://docs.ragie.ai/docs/webhooks.",
        "operationId": "eventevent_post",
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "anyOf": [
                  {
                    "properties": {
                      "nonce": {
                        "type": "string",
                        "title": "Nonce"
                      },
                      "type": {
                        "type": "string",
                        "const": "document_status_updated",
                        "title": "Type"
                      },
                      "payload": {
                        "properties": {
                          "document_id": {
                            "type": "string",
                            "title": "Document Id"
                          },
                          "status": {
                            "anyOf": [
                              {
                                "type": "string",
                                "const": "ready"
                              },
                              {
                                "type": "string",
                                "const": "failed"
                              },
                              {
                                "type": "string",
                                "const": "indexed"
                              },
                              {
                                "type": "string",
                                "const": "keyword_indexed"
                              }
                            ],
                            "title": "Status"
                          },
                          "partition": {
                            "type": "string",
                            "title": "Partition"
                          },
                          "metadata": {
                            "additionalProperties": true,
                            "type": "object",
                            "title": "Metadata"
                          },
                          "external_id": {
                            "anyOf": [
                              {
                                "type": "string"
                              },
                              {
                                "type": "null"
                              }
                            ],
                            "title": "External Id"
                          },
                          "name": {
                            "type": "string",
                            "title": "Name"
                          },
                          "connection_id": {
                            "anyOf": [
                              {
                                "type": "string"
                              },
                              {
                                "type": "null"
                              }
                            ],
                            "title": "Connection Id"
                          },
                          "sync_id": {
                            "anyOf": [
                              {
                                "type": "string"
                              },
                              {
                                "type": "null"
                              }
                            ],
                            "title": "Sync Id"
                          },
                          "error": {
                            "anyOf": [
                              {
                                "type": "string"
                              },
                              {
                                "type": "null"
                              }
                            ],
                            "title": "Error"
                          }
                        },
                        "type": "object",
                        "required": [
                          "document_id",
                          "status",
                          "partition",
                          "metadata",
                          "external_id",
                          "name",
                          "connection_id",
                          "sync_id",
                          "error"
                        ],
                        "title": "DocumentUpdateWebhookPayload",
                        "x-readme-ref-name": "DocumentUpdateWebhookPayload"
                      }
                    },
                    "type": "object",
                    "required": [
                      "nonce",
                      "type",
                      "payload"
                    ],
                    "title": "DocumentUpdateWebhook",
                    "x-readme-ref-name": "DocumentUpdateWebhook"
                  },
                  {
                    "properties": {
                      "nonce": {
                        "type": "string",
                        "title": "Nonce"
                      },
                      "type": {
                        "type": "string",
                        "const": "document_deleted",
                        "title": "Type"
                      },
                      "payload": {
                        "properties": {
                          "document_id": {
                            "type": "string",
                            "title": "Document Id"
                          },
                          "partition": {
                            "type": "string",
                            "title": "Partition"
                          },
                          "metadata": {
                            "additionalProperties": true,
                            "type": "object",
                            "title": "Metadata"
                          },
                          "external_id": {
                            "anyOf": [
                              {
                                "type": "string"
                              },
                              {
                                "type": "null"
                              }
                            ],
                            "title": "External Id"
                          },
                          "name": {
                            "type": "string",
                            "title": "Name"
                          },
                          "connection_id": {
                            "anyOf": [
                              {
                                "type": "string"
                              },
                              {
                                "type": "null"
                              }
                            ],
                            "title": "Connection Id"
                          },
                          "sync_id": {
                            "anyOf": [
                              {
                                "type": "string"
                              },
                              {
                                "type": "null"
                              }
                            ],
                            "title": "Sync Id"
                          }
                        },
                        "type": "object",
                        "required": [
                          "document_id",
                          "partition",
                          "metadata",
                          "external_id",
                          "name",
                          "connection_id",
                          "sync_id"
                        ],
                        "title": "DocumentDeleteWebhookPayload",
                        "x-readme-ref-name": "DocumentDeleteWebhookPayload"
                      }
                    },
                    "type": "object",
                    "required": [
                      "nonce",
                      "type",
                      "payload"
                    ],
                    "title": "DocumentDeleteWebhook",
                    "x-readme-ref-name": "DocumentDeleteWebhook"
                  },
                  {
                    "properties": {
                      "nonce": {
                        "type": "string",
                        "title": "Nonce"
                      },
                      "type": {
                        "type": "string",
                        "const": "entity_extracted",
                        "title": "Type"
                      },
                      "payload": {
                        "properties": {
                          "entity_id": {
                            "type": "string",
                            "title": "Entity Id"
                          },
                          "document_id": {
                            "type": "string",
                            "title": "Document Id"
                          },
                          "instruction_id": {
                            "type": "string",
                            "title": "Instruction Id"
                          },
                          "document_metadata": {
                            "additionalProperties": true,
                            "type": "object",
                            "title": "Document Metadata"
                          },
                          "document_external_id": {
                            "anyOf": [
                              {
                                "type": "string"
                              },
                              {
                                "type": "null"
                              }
                            ],
                            "title": "Document External Id"
                          },
                          "document_name": {
                            "type": "string",
                            "title": "Document Name"
                          },
                          "partition": {
                            "type": "string",
                            "title": "Partition"
                          },
                          "sync_id": {
                            "anyOf": [
                              {
                                "type": "string"
                              },
                              {
                                "type": "null"
                              }
                            ],
                            "title": "Sync Id"
                          },
                          "data": {
                            "additionalProperties": true,
                            "type": "object",
                            "title": "Data"
                          }
                        },
                        "type": "object",
                        "required": [
                          "entity_id",
                          "document_id",
                          "instruction_id",
                          "document_metadata",
                          "document_external_id",
                          "document_name",
                          "partition",
                          "sync_id",
                          "data"
                        ],
                        "title": "EntityExtractedWebhookPayload",
                        "x-readme-ref-name": "EntityExtractedWebhookPayload"
                      }
                    },
                    "type": "object",
                    "required": [
                      "nonce",
                      "type",
                      "payload"
                    ],
                    "title": "EntityExtractedWebhook",
                    "x-readme-ref-name": "EntityExtractedWebhook"
                  },
                  {
                    "properties": {
                      "nonce": {
                        "type": "string",
                        "title": "Nonce"
                      },
                      "type": {
                        "type": "string",
                        "const": "connection_sync_started",
                        "title": "Type"
                      },
                      "payload": {
                        "properties": {
                          "connection_id": {
                            "type": "string",
                            "title": "Connection Id"
                          },
                          "sync_id": {
                            "type": "string",
                            "title": "Sync Id"
                          },
                          "partition": {
                            "type": "string",
                            "title": "Partition"
                          },
                          "connection_metadata": {
                            "additionalProperties": true,
                            "type": "object",
                            "title": "Connection Metadata"
                          },
                          "create_count": {
                            "type": "integer",
                            "title": "Create Count"
                          },
                          "update_content_count": {
                            "type": "integer",
                            "title": "Update Content Count"
                          },
                          "update_metadata_count": {
                            "type": "integer",
                            "title": "Update Metadata Count"
                          },
                          "delete_count": {
                            "type": "integer",
                            "title": "Delete Count"
                          }
                        },
                        "type": "object",
                        "required": [
                          "connection_id",
                          "sync_id",
                          "partition",
                          "connection_metadata",
                          "create_count",
                          "update_content_count",
                          "update_metadata_count",
                          "delete_count"
                        ],
                        "title": "ConnectionSyncStartedWebhookPayload",
                        "x-readme-ref-name": "ConnectionSyncStartedWebhookPayload"
                      }
                    },
                    "type": "object",
                    "required": [
                      "nonce",
                      "type",
                      "payload"
                    ],
                    "title": "ConnectionSyncStartedWebhook",
                    "x-readme-ref-name": "ConnectionSyncStartedWebhook"
                  },
                  {
                    "properties": {
                      "nonce": {
                        "type": "string",
                        "title": "Nonce"
                      },
                      "type": {
                        "type": "string",
                        "const": "connection_sync_progress",
                        "title": "Type"
                      },
                      "payload": {
                        "properties": {
                          "connection_id": {
                            "type": "string",
                            "title": "Connection Id"
                          },
                          "sync_id": {
                            "type": "string",
                            "title": "Sync Id"
                          },
                          "partition": {
                            "type": "string",
                            "title": "Partition"
                          },
                          "connection_metadata": {
                            "additionalProperties": true,
                            "type": "object",
                            "title": "Connection Metadata"
                          },
                          "create_count": {
                            "type": "integer",
                            "title": "Create Count"
                          },
                          "created_count": {
                            "type": "integer",
                            "title": "Created Count"
                          },
                          "update_content_count": {
                            "type": "integer",
                            "title": "Update Content Count"
                          },
                          "updated_content_count": {
                            "type": "integer",
                            "title": "Updated Content Count"
                          },
                          "update_metadata_count": {
                            "type": "integer",
                            "title": "Update Metadata Count"
                          },
                          "updated_metadata_count": {
                            "type": "integer",
                            "title": "Updated Metadata Count"
                          },
                          "delete_count": {
                            "type": "integer",
                            "title": "Delete Count"
                          },
                          "deleted_count": {
                            "type": "integer",
                            "title": "Deleted Count"
                          },
                          "errored_count": {
                            "type": "integer",
                            "title": "Errored Count"
                          }
                        },
                        "type": "object",
                        "required": [
                          "connection_id",
                          "sync_id",
                          "partition",
                          "connection_metadata",
                          "create_count",
                          "created_count",
                          "update_content_count",
                          "updated_content_count",
                          "update_metadata_count",
                          "updated_metadata_count",
                          "delete_count",
                          "deleted_count",
                          "errored_count"
                        ],
                        "title": "ConnectionSyncProgressWebhookPayload",
                        "x-readme-ref-name": "ConnectionSyncProgressWebhookPayload"
                      }
                    },
                    "type": "object",
                    "required": [
                      "nonce",
                      "type",
                      "payload"
                    ],
                    "title": "ConnectionSyncProgressWebhook",
                    "x-readme-ref-name": "ConnectionSyncProgressWebhook"
                  },
                  {
                    "properties": {
                      "nonce": {
                        "type": "string",
                        "title": "Nonce"
                      },
                      "type": {
                        "type": "string",
                        "const": "connection_sync_finished",
                        "title": "Type"
                      },
                      "payload": {
                        "properties": {
                          "connection_id": {
                            "type": "string",
                            "title": "Connection Id"
                          },
                          "sync_id": {
                            "type": "string",
                            "title": "Sync Id"
                          },
                          "partition": {
                            "type": "string",
                            "title": "Partition"
                          },
                          "connection_metadata": {
                            "additionalProperties": true,
                            "type": "object",
                            "title": "Connection Metadata"
                          }
                        },
                        "type": "object",
                        "required": [
                          "connection_id",
                          "sync_id",
                          "partition",
                          "connection_metadata"
                        ],
                        "title": "ConnectionSyncFinishedWebhookPayload",
                        "x-readme-ref-name": "ConnectionSyncFinishedWebhookPayload"
                      }
                    },
                    "type": "object",
                    "required": [
                      "nonce",
                      "type",
                      "payload"
                    ],
                    "title": "ConnectionSyncFinishedWebhook",
                    "x-readme-ref-name": "ConnectionSyncFinishedWebhook"
                  },
                  {
                    "properties": {
                      "nonce": {
                        "type": "string",
                        "title": "Nonce"
                      },
                      "type": {
                        "type": "string",
                        "const": "connection_limit_exceeded",
                        "title": "Type"
                      },
                      "payload": {
                        "properties": {
                          "connection_id": {
                            "type": "string",
                            "title": "Connection Id"
                          },
                          "partition": {
                            "anyOf": [
                              {
                                "type": "string"
                              },
                              {
                                "type": "null"
                              }
                            ],
                            "title": "Partition"
                          },
                          "connection_metadata": {
                            "additionalProperties": true,
                            "type": "object",
                            "title": "Connection Metadata"
                          },
                          "limit_type": {
                            "type": "string",
                            "const": "page_limit",
                            "title": "Limit Type"
                          }
                        },
                        "type": "object",
                        "required": [
                          "connection_id",
                          "partition",
                          "connection_metadata",
                          "limit_type"
                        ],
                        "title": "ConnectionLimitExceededWebhookPayload",
                        "x-readme-ref-name": "ConnectionLimitExceededWebhookPayload"
                      }
                    },
                    "type": "object",
                    "required": [
                      "nonce",
                      "type",
                      "payload"
                    ],
                    "title": "ConnectionLimitExceededWebhook",
                    "x-readme-ref-name": "ConnectionLimitExceededWebhook"
                  },
                  {
                    "properties": {
                      "nonce": {
                        "type": "string",
                        "title": "Nonce"
                      },
                      "type": {
                        "type": "string",
                        "const": "partition_limit_exceeded",
                        "title": "Type"
                      },
                      "payload": {
                        "properties": {
                          "partition": {
                            "type": "string",
                            "title": "Partition"
                          },
                          "limit_type": {
                            "type": "string",
                            "enum": [
                              "pages_processed_limit_monthly",
                              "pages_hosted_limit_monthly",
                              "pages_processed_limit_max",
                              "pages_hosted_limit_max",
                              "video_processed_limit_monthly",
                              "video_processed_limit_max",
                              "audio_processed_limit_monthly",
                              "audio_processed_limit_max",
                              "media_streamed_limit_monthly",
                              "media_streamed_limit_max",
                              "media_hosted_limit_monthly",
                              "media_hosted_limit_max"
                            ],
                            "title": "Limit Type"
                          }
                        },
                        "type": "object",
                        "required": [
                          "partition",
                          "limit_type"
                        ],
                        "title": "PartitionLimitExceededWebhookPayload",
                        "x-readme-ref-name": "PartitionLimitExceededWebhookPayload"
                      }
                    },
                    "type": "object",
                    "required": [
                      "nonce",
                      "type",
                      "payload"
                    ],
                    "title": "PartitionLimitExceededWebhook",
                    "x-readme-ref-name": "PartitionLimitExceededWebhook"
                  },
                  {
                    "properties": {
                      "nonce": {
                        "type": "string",
                        "title": "Nonce"
                      },
                      "type": {
                        "type": "string",
                        "const": "partition_limit_reset",
                        "title": "Type"
                      },
                      "payload": {
                        "properties": {
                          "partition": {
                            "type": "string",
                            "title": "Partition"
                          }
                        },
                        "type": "object",
                        "required": [
                          "partition"
                        ],
                        "title": "PartitionLimitResetWebhookPayload",
                        "x-readme-ref-name": "PartitionLimitResetWebhookPayload"
                      }
                    },
                    "type": "object",
                    "required": [
                      "nonce",
                      "type",
                      "payload"
                    ],
                    "title": "PartitionLimitResetWebhook",
                    "x-readme-ref-name": "PartitionLimitResetWebhook"
                  }
                ],
                "title": "Body"
              }
            }
          },
          "required": true
        },
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {}
              }
            }
          },
          "422": {
            "description": "Validation Error",
            "content": {
              "application/json": {
                "schema": {
                  "properties": {
                    "detail": {
                      "items": {
                        "properties": {
                          "loc": {
                            "items": {
                              "anyOf": [
                                {
                                  "type": "string"
                                },
                                {
                                  "type": "integer"
                                }
                              ]
                            },
                            "type": "array",
                            "title": "Location"
                          },
                          "msg": {
                            "type": "string",
                            "title": "Message"
                          },
                          "type": {
                            "type": "string",
                            "title": "Error Type"
                          }
                        },
                        "type": "object",
                        "required": [
                          "loc",
                          "msg",
                          "type"
                        ],
                        "title": "ValidationError",
                        "x-readme-ref-name": "ValidationError"
                      },
                      "type": "array",
                      "title": "Detail"
                    }
                  },
                  "type": "object",
                  "title": "HTTPValidationError",
                  "x-readme-ref-name": "HTTPValidationError"
                }
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "securitySchemes": {
      "auth": {
        "type": "http",
        "scheme": "bearer"
      }
    }
  },
  "security": [
    {
      "auth": []
    }
  ]
}
```