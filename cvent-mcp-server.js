#!/usr/bin/env node

const http = require('http');
const readline = require('readline');

// Configuration
const CVENT_CLIENT_ID = process.env.CVENT_CLIENT_ID;
const CVENT_CLIENT_SECRET = process.env.CVENT_CLIENT_SECRET;
const CVENT_BASE_URL = 'https://api.cvent.com';
const CVENT_TOKEN_URL = 'https://api-platform.cvent.com/ea/oauth2/token';

let accessToken = null;
let tokenExpireTime = 0;

// Helper: Get OAuth token from Cvent
async function getAccessToken() {
  if (accessToken && Date.now() < tokenExpireTime) {
    return accessToken;
  }

  const credentials = Buffer.from(`${CVENT_CLIENT_ID}:${CVENT_CLIENT_SECRET}`).toString('base64');
  
  const postData = new URLSearchParams({
    grant_type: 'client_credentials'
  }).toString();

  return new Promise((resolve, reject) => {
    const url = new URL(CVENT_TOKEN_URL);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = require('https').request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          accessToken = response.access_token;
          tokenExpireTime = Date.now() + (response.expires_in * 1000) - 60000;
          resolve(accessToken);
        } catch (e) {
          reject(new Error(`Token response parse error: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Helper: Make Cvent API call
async function cventApiCall(method, endpoint, body = null) {
  const token = await getAccessToken();
  const url = new URL(`${CVENT_BASE_URL}${endpoint}`);

  return new Promise((resolve, reject) => {
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };

    const req = require('https').request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject(new Error(`Cvent API error: ${res.statusCode} - ${JSON.stringify(response)}`));
          } else {
            resolve(response);
          }
        } catch (e) {
          reject(new Error(`Response parse error: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Tool: Create Campaign
async function createCampaign(eventId, campaignName, description = '') {
  const body = {
    eventId: eventId,
    name: campaignName,
    description: description,
    campaignType: 'Invitation'
  };
  return await cventApiCall('POST', '/v2/events/{eventId}/campaigns', body);
}

// Tool: Send Campaign Invites
async function sendCampaignInvites(eventId, campaignId, inviteeEmails) {
  const body = {
    eventId: eventId,
    campaignId: campaignId,
    invitees: inviteeEmails.map(email => ({ email: email }))
  };
  return await cventApiCall('POST', `/v2/events/${eventId}/campaigns/${campaignId}/send`, body);
}

// Tool: Get Attendees/Registrations
async function getAttendees(eventId, limit = 100) {
  return await cventApiCall('GET', `/v2/events/${eventId}/registrations?limit=${limit}`);
}

// Tool: Update Attendee Status
async function updateAttendeeStatus(eventId, registrationId, status) {
  const body = {
    status: status // e.g., 'Confirmed', 'Cancelled', etc.
  };
  return await cventApiCall('PUT', `/v2/events/${eventId}/registrations/${registrationId}`, body);
}

// Tool: Get Campaign Performance Data
async function getCampaignPerformance(eventId, campaignId) {
  return await cventApiCall('GET', `/v2/events/${eventId}/campaigns/${campaignId}/analytics`);
}

// MCP Tools Definition
const tools = [
  {
    name: 'create_campaign',
    description: 'Create a new campaign for a forum/event in Cvent',
    inputSchema: {
      type: 'object',
      properties: {
        eventId: {
          type: 'string',
          description: 'The Cvent event ID for the forum'
        },
        campaignName: {
          type: 'string',
          description: 'Name of the campaign'
        },
        description: {
          type: 'string',
          description: 'Campaign description (optional)'
        }
      },
      required: ['eventId', 'campaignName']
    }
  },
  {
    name: 'send_campaign_invites',
    description: 'Send campaign invitations to a list of email addresses',
    inputSchema: {
      type: 'object',
      properties: {
        eventId: {
          type: 'string',
          description: 'The Cvent event ID'
        },
        campaignId: {
          type: 'string',
          description: 'The campaign ID to send'
        },
        inviteeEmails: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of email addresses to invite'
        }
      },
      required: ['eventId', 'campaignId', 'inviteeEmails']
    }
  },
  {
    name: 'get_attendees',
    description: 'Get list of attendees/registrations for an event',
    inputSchema: {
      type: 'object',
      properties: {
        eventId: {
          type: 'string',
          description: 'The Cvent event ID'
        },
        limit: {
          type: 'number',
          description: 'Max number of results (default 100)'
        }
      },
      required: ['eventId']
    }
  },
  {
    name: 'update_attendee_status',
    description: 'Update the status of an attendee registration',
    inputSchema: {
      type: 'object',
      properties: {
        eventId: {
          type: 'string',
          description: 'The Cvent event ID'
        },
        registrationId: {
          type: 'string',
          description: 'The registration ID'
        },
        status: {
          type: 'string',
          description: 'New status (e.g., Confirmed, Cancelled, Pending)'
        }
      },
      required: ['eventId', 'registrationId', 'status']
    }
  },
  {
    name: 'get_campaign_performance',
    description: 'Get performance metrics for a campaign (opens, clicks, etc.)',
    inputSchema: {
      type: 'object',
      properties: {
        eventId: {
          type: 'string',
          description: 'The Cvent event ID'
        },
        campaignId: {
          type: 'string',
          description: 'The campaign ID'
        }
      },
      required: ['eventId', 'campaignId']
    }
  }
];

// MCP Server
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function handleToolCall(toolName, toolInput) {
  try {
    switch (toolName) {
      case 'create_campaign':
        return await createCampaign(toolInput.eventId, toolInput.campaignName, toolInput.description || '');
      case 'send_campaign_invites':
        return await sendCampaignInvites(toolInput.eventId, toolInput.campaignId, toolInput.inviteeEmails);
      case 'get_attendees':
        return await getAttendees(toolInput.eventId, toolInput.limit || 100);
      case 'update_attendee_status':
        return await updateAttendeeStatus(toolInput.eventId, toolInput.registrationId, toolInput.status);
      case 'get_campaign_performance':
        return await getCampaignPerformance(toolInput.eventId, toolInput.campaignId);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  } catch (error) {
    return { error: error.message };
  }
}

rl.on('line', async (line) => {
  try {
    const message = JSON.parse(line);

    if (message.jsonrpc === '2.0') {
      if (message.method === 'initialize') {
        const response = {
          jsonrpc: '2.0',
          id: message.id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            serverInfo: {
              name: 'cvent-mcp-server',
              version: '1.0.0'
            }
          }
        };
        console.log(JSON.stringify(response));
      } else if (message.method === 'tools/list') {
        const response = {
          jsonrpc: '2.0',
          id: message.id,
          result: {
            tools: tools
          }
        };
        console.log(JSON.stringify(response));
      } else if (message.method === 'tools/call') {
        const result = await handleToolCall(message.params.name, message.params.arguments);
        const response = {
          jsonrpc: '2.0',
          id: message.id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ]
          }
        };
        console.log(JSON.stringify(response));
      }
    }
  } catch (error) {
    const errorResponse = {
      jsonrpc: '2.0',
      id: message?.id || null,
      error: {
        code: -32603,
        message: error.message
      }
    };
    console.log(JSON.stringify(errorResponse));
  }
});

console.error('Cvent MCP Server started. Waiting for requests...');
