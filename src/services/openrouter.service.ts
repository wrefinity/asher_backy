import OpenAI from "openai";

/**
 * OpenRouter AI Service
 * Provides AI-powered features for document generation, content analysis, and intelligent automation
 */
class OpenRouterService {
  private client: OpenAI;
  private defaultModel: string;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
    });
    this.defaultModel = process.env.OPENROUTER_MODEL || "anthropic/claude-3.5-sonnet";
  }

  /**
   * Generate a document template with AI
   */
  async generateDocumentTemplate(params: {
    title: string;
    type: string;
    additionalRequirements?: string;
  }): Promise<string> {
    try {
      const { title, type, additionalRequirements } = params;

      const prompt = `You are a legal document specialist for property management. Create a professional document template.

Title: ${title}
Document Type: ${type}
${additionalRequirements ? `Additional Requirements: ${additionalRequirements}` : ""}

Requirements:
- Professional HTML format using <h1>, <h2>, <p>, <ul>, <li>, <table> as appropriate
- Include relevant placeholders like [Date], [Landlord Name], [Tenant Name], [Property Address], etc.
- Make it look formal and comprehensive
- Include all standard sections for this document type
- Add signature lines where appropriate

Return ONLY the HTML document template, no JSON wrapper.`;

      const completion = await this.client.chat.completions.create({
        model: this.defaultModel,
        messages: [{ role: "user", content: prompt }],
      });

      return completion.choices[0]?.message?.content || "<h1>Error</h1><p>Could not generate template.</p>";
    } catch (error) {
      console.error("OpenRouter Document Template Error:", error);
      return "<h1>Error</h1><p>Could not generate template.</p>";
    }
  }

  /**
   * Generate property description with AI
   */
  async generatePropertyDescription(propertyData: {
    type: string;
    bedrooms?: number;
    bathrooms?: number;
    size?: string;
    amenities?: string[];
    location?: string;
    rent?: number;
    features?: string[];
  }): Promise<string> {
    try {
      const { type, bedrooms, bathrooms, size, amenities, location, rent, features } = propertyData;

      const prompt = `Create an engaging property listing description for a property management platform.

Property Details:
- Type: ${type}
${bedrooms ? `- Bedrooms: ${bedrooms}` : ""}
${bathrooms ? `- Bathrooms: ${bathrooms}` : ""}
${size ? `- Size: ${size}` : ""}
${location ? `- Location: ${location}` : ""}
${rent ? `- Monthly Rent: $${rent}` : ""}
${amenities?.length ? `- Amenities: ${amenities.join(", ")}` : ""}
${features?.length ? `- Features: ${features.join(", ")}` : ""}

Create a compelling, SEO-optimized property description (150-200 words) in HTML format. Use <p> tags and make it appealing to potential tenants. Highlight key features and benefits.

Return ONLY the HTML description.`;

      const completion = await this.client.chat.completions.create({
        model: this.defaultModel,
        messages: [{ role: "user", content: prompt }],
      });

      return completion.choices[0]?.message?.content || "<p>Property description unavailable.</p>";
    } catch (error) {
      console.error("OpenRouter Property Description Error:", error);
      return "<p>Property description unavailable.</p>";
    }
  }

  /**
   * Generate FAQ from support tickets
   */
  async generateFAQFromTickets(tickets: Array<{
    subject: string;
    description: string;
    resolution?: string;
  }>): Promise<Array<{ question: string; answer: string; category: string }>> {
    try {
      const ticketSummaries = tickets.slice(0, 15).map((t) => ({
        subject: t.subject,
        description: t.description,
        resolution: t.resolution || "Resolved",
      }));

      const prompt = `You are a knowledge base specialist. Analyze these common support tickets and create FAQ entries.

Tickets:
${JSON.stringify(ticketSummaries, null, 2)}

Create 3-7 FAQ entries based on common patterns. Return JSON format:
{
  "faqs": [
    {
      "question": "Clear, user-friendly question",
      "answer": "Helpful, detailed answer",
      "category": "billing|maintenance|account|property|other"
    }
  ]
}

Focus on the most common or important issues. Make answers comprehensive but concise.`;

      const completion = await this.client.chat.completions.create({
        model: this.defaultModel,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) return [];

      const data = JSON.parse(responseText);
      return data.faqs || [];
    } catch (error) {
      console.error("OpenRouter FAQ Generation Error:", error);
      return [];
    }
  }

  /**
   * Generate help article content
   */
  async generateHelpArticle(params: {
    topic: string;
    targetAudience?: string;
  }): Promise<{ title: string; content: string; summary: string }> {
    try {
      const { topic, targetAudience = "property managers" } = params;

      const prompt = `Create a comprehensive help article for a property management platform.

Topic: ${topic}
Target Audience: ${targetAudience}

Generate a JSON response with:
- title: Clear, SEO-friendly article title
- summary: 1-2 sentence overview
- content: Full article in HTML format with <h2>, <p>, <ul>, <li>, <strong> tags. Make it detailed (300-500 words) with actionable steps and best practices.

Return ONLY valid JSON.`;

      const completion = await this.client.chat.completions.create({
        model: this.defaultModel,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) throw new Error("No response from AI");

      return JSON.parse(responseText);
    } catch (error) {
      console.error("OpenRouter Help Article Error:", error);
      return {
        title: "Article generation failed",
        content: "<p>Unable to generate article content.</p>",
        summary: "Error occurred during generation",
      };
    }
  }

  /**
   * Generate video summary and metadata
   */
  async generateVideoSummary(params: {
    videoTitle: string;
    videoDescription: string;
    duration: string;
  }): Promise<{ summary: string; keyPoints: string[]; targetAudience: string; tags: string[] }> {
    try {
      const { videoTitle, videoDescription, duration } = params;

      const prompt = `Analyze this video tutorial and create helpful metadata.

Title: ${videoTitle}
Description: ${videoDescription}
Duration: ${duration}

Provide a JSON response with:
- summary: A 2-3 sentence overview of what viewers will learn
- keyPoints: Array of 3-5 main learning points from this video
- targetAudience: Who should watch this (e.g., "New landlords", "Property managers", "All users")
- tags: Array of 5-7 relevant tags for categorization and search

Return ONLY valid JSON.`;

      const completion = await this.client.chat.completions.create({
        model: this.defaultModel,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) throw new Error("No response from AI");

      return JSON.parse(responseText);
    } catch (error) {
      console.error("OpenRouter Video Summary Error:", error);
      return {
        summary: "Summary generation failed",
        keyPoints: [],
        targetAudience: "All users",
        tags: [],
      };
    }
  }

  /**
   * Analyze support ticket and provide insights
   */
  async analyzeTicket(ticket: {
    subject: string;
    description: string;
    status?: string;
    priority?: string;
    messages?: any[];
  }): Promise<{
    summary: string;
    suggestion: string;
    priority: string;
    category: string;
    sentiment: string;
  }> {
    try {
      const { subject, description, status, priority, messages } = ticket;

      const prompt = `You are an expert property management support analyst. Analyze this support ticket and provide actionable insights.

Subject: ${subject}
Description: ${description}
${status ? `Status: ${status}` : ""}
${priority ? `Priority: ${priority}` : ""}
${messages ? `Messages: ${JSON.stringify(messages, null, 2)}` : ""}

Provide a comprehensive analysis in JSON format with:
- summary: A concise 1-2 sentence summary of the issue
- suggestion: A professional, actionable response draft for the support agent
- priority: Recommended priority level (low, medium, high, urgent)
- category: Issue category (maintenance, billing, tenant_relations, property_access, technical, other)
- sentiment: User's emotional state (positive, neutral, frustrated, angry, urgent)

Return ONLY valid JSON with no additional text.`;

      const completion = await this.client.chat.completions.create({
        model: this.defaultModel,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) throw new Error("No response from AI");

      return JSON.parse(responseText);
    } catch (error) {
      console.error("OpenRouter Ticket Analysis Error:", error);
      return {
        summary: "Analysis unavailable",
        suggestion: "Please review this ticket manually.",
        priority: "medium",
        category: "other",
        sentiment: "neutral",
      };
    }
  }

  /**
   * Generate email draft
   */
  async generateEmailDraft(params: {
    subject: string;
    recipientRole: string;
    context?: string;
    tone?: "formal" | "friendly" | "urgent";
  }): Promise<string> {
    try {
      const { subject, recipientRole, context, tone = "formal" } = params;

      const prompt = `You are a professional property manager. Write an email with the following details:

Subject: ${subject}
Recipient Role: ${recipientRole}
Tone: ${tone}
${context ? `Additional Context: ${context}` : ""}

Requirements:
- Professional and polite tone
- Clear and concise (under 150 words)
- HTML format using <p>, <br>, and appropriate tags
- Avoid unnecessary placeholders - infer reasonable content from the subject
- Include a proper greeting and closing

Return ONLY the HTML email body, no JSON wrapper.`;

      const completion = await this.client.chat.completions.create({
        model: this.defaultModel,
        messages: [{ role: "user", content: prompt }],
      });

      return completion.choices[0]?.message?.content || "<p>Error generating draft. Please compose manually.</p>";
    } catch (error) {
      console.error("OpenRouter Email Draft Error:", error);
      return "<p>Error generating draft. Please compose manually.</p>";
    }
  }

  /**
   * Generate smart chat replies
   */
  async generateSmartReplies(params: {
    conversationHistory: Array<{ sender: string; message: string }>;
    context?: string;
  }): Promise<string[]> {
    try {
      const { conversationHistory, context } = params;

      const recentContext = conversationHistory
        .slice(-10)
        .map((msg) => `${msg.sender}: ${msg.message}`)
        .join("\n");

      const prompt = `You are a professional property management support agent. Based on this conversation, generate 3 smart, contextually appropriate replies.

${context ? `Context: ${context}\n` : ""}
Conversation History:
${recentContext}

Requirements:
- Keep replies professional and empathetic
- Make them short (1-2 sentences each)
- Ensure they're distinct from each other
- Address the user's most recent message appropriately

Return a JSON object with format: { "replies": ["Reply 1", "Reply 2", "Reply 3"] }`;

      const completion = await this.client.chat.completions.create({
        model: this.defaultModel,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) return [];

      const data = JSON.parse(responseText);
      return data.replies || [];
    } catch (error) {
      console.error("OpenRouter Smart Replies Error:", error);
      return [];
    }
  }

  /**
   * Sentiment analysis
   */
  async analyzeSentiment(text: string): Promise<{
    sentiment: "positive" | "neutral" | "negative" | "urgent";
    score: number;
    escalationRecommended: boolean;
    reason?: string;
  }> {
    try {
      const prompt = `Analyze the sentiment of this message from a property management context.

Message: ${text}

Return JSON with:
- sentiment: "positive" | "neutral" | "negative" | "urgent"
- score: Number from -1 (very negative) to 1 (very positive)
- escalationRecommended: true if this requires immediate supervisor attention
- reason: Brief explanation if escalation is recommended

Return ONLY valid JSON.`;

      const completion = await this.client.chat.completions.create({
        model: this.defaultModel,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) throw new Error("No response from AI");

      return JSON.parse(responseText);
    } catch (error) {
      console.error("OpenRouter Sentiment Analysis Error:", error);
      return {
        sentiment: "neutral",
        score: 0,
        escalationRecommended: false,
      };
    }
  }

  /**
   * Content enhancement
   */
  async enhanceContent(params: {
    content: string;
    enhancementType: "grammar" | "tone" | "expand" | "summarize";
  }): Promise<string> {
    try {
      const { content, enhancementType } = params;

      const enhancements = {
        grammar: "Fix grammar, spelling, and punctuation errors while preserving the original meaning and tone.",
        tone: "Adjust the tone to be more professional and polite while keeping the core message.",
        expand: "Expand this content with more details and context, making it more comprehensive.",
        summarize: "Summarize this content concisely, capturing only the key points.",
      };

      const prompt = `${enhancements[enhancementType]}

Original Content:
${content}

Return ONLY the enhanced content, no explanations or JSON wrapper.`;

      const completion = await this.client.chat.completions.create({
        model: this.defaultModel,
        messages: [{ role: "user", content: prompt }],
      });

      return completion.choices[0]?.message?.content || content;
    } catch (error) {
      console.error("OpenRouter Content Enhancement Error:", error);
      return error
    }
  }

  /**
   * Extract document information using AI
   */
  async extractDocumentInfo(params: {
    documentText: string;
    documentType: string;
  }): Promise<Record<string, any>> {
    try {
      const { documentText, documentType } = params;

      const prompt = `Extract key information from this ${documentType} document.

Document Content:
${documentText.substring(0, 4000)} // Limit to avoid token overflow

Extract relevant fields based on the document type and return them as JSON. For example:
- For lease agreements: tenant name, landlord name, property address, lease start date, lease end date, monthly rent, security deposit
- For invoices: invoice number, date, amount, due date, items
- For applications: applicant name, contact info, employment details, references

Return ONLY valid JSON with extracted fields.`;

      const completion = await this.client.chat.completions.create({
        model: this.defaultModel,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) return {};

      return JSON.parse(responseText);
    } catch (error) {
      console.error("OpenRouter Document Extraction Error:", error);
      return {};
    }
  }

  /**
   * Generate maintenance report
   */
  async generateMaintenanceReport(params: {
    propertyId: string;
    propertyAddress: string;
    maintenanceRequests: Array<{
      type: string;
      description: string;
      status: string;
      date: string;
    }>;
  }): Promise<string> {
    try {
      const { propertyAddress, maintenanceRequests } = params;

      const prompt = `Generate a comprehensive maintenance report for a property.

Property Address: ${propertyAddress}
Maintenance Requests:
${JSON.stringify(maintenanceRequests, null, 2)}

Create a professional HTML report that includes:
- Executive summary
- Overview of all maintenance activities
- Status breakdown
- Recommendations for preventive maintenance
- Cost analysis if applicable

Use proper HTML formatting with headings, tables, and lists.

Return ONLY the HTML report.`;

      const completion = await this.client.chat.completions.create({
        model: this.defaultModel,
        messages: [{ role: "user", content: prompt }],
      });

      return completion.choices[0]?.message?.content || "<p>Unable to generate report.</p>";
    } catch (error) {
      console.error("OpenRouter Maintenance Report Error:", error);
      return "<p>Unable to generate report.</p>";
    }
  }

  /**
   * Generate lease agreement
   */
  async generateLeaseAgreement(params: {
    landlordName: string;
    tenantName: string;
    propertyAddress: string;
    monthlyRent: number;
    securityDeposit: number;
    leaseStartDate: string;
    leaseEndDate: string;
    additionalTerms?: string[];
  }): Promise<string> {
    try {
      const {
        landlordName,
        tenantName,
        propertyAddress,
        monthlyRent,
        securityDeposit,
        leaseStartDate,
        leaseEndDate,
        additionalTerms,
      } = params;

      const prompt = `Generate a comprehensive residential lease agreement with the following details:

Landlord: ${landlordName}
Tenant: ${tenantName}
Property Address: ${propertyAddress}
Monthly Rent: $${monthlyRent}
Security Deposit: $${securityDeposit}
Lease Start Date: ${leaseStartDate}
Lease End Date: ${leaseEndDate}
${additionalTerms?.length ? `Additional Terms: ${additionalTerms.join(", ")}` : ""}

Create a legally sound, comprehensive lease agreement in HTML format that includes all standard clauses:
- Parties and property description
- Term and rent
- Security deposit
- Utilities and maintenance responsibilities
- Rules and regulations
- Termination clauses
- Signature blocks

Use proper legal language and HTML formatting.

Return ONLY the HTML document.`;

      const completion = await this.client.chat.completions.create({
        model: this.defaultModel,
        messages: [{ role: "user", content: prompt }],
      });

      return completion.choices[0]?.message?.content || "<p>Unable to generate lease agreement.</p>";
    } catch (error) {
      console.error("OpenRouter Lease Generation Error:", error);
      return "<p>Unable to generate lease agreement.</p>";
    }
  }
}

// Export singleton instance
export const openRouterService = new OpenRouterService();
export default openRouterService;
