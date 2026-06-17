export async function personalizeCreative(customerId: string, channel: string, context: any) {
  try {
    const res = await fetch("http://localhost:8000/v1/personalize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        customer_id: customerId,
        channel: channel,
        context: context
      })
    });
    
    if (!res.ok) {
      throw new Error("Failed to fetch personalization");
    }
    
    return await res.json();
  } catch (error) {
    console.error("Error calling FastAPI:", error);
    return null;
  }
}

export async function getAnalyticsOverview() {
  try {
    const res = await fetch("http://localhost:8000/v1/analytics/overview");
    if (!res.ok) throw new Error("API failed");
    return await res.json();
  } catch (error) {
    console.error("Error calling FastAPI:", error);
    return null;
  }
}

export async function getCustomerProfile(customerId: string) {
  try {
    const res = await fetch(`http://localhost:8000/v1/customer/${customerId}`);
    if (!res.ok) throw new Error("API failed");
    return await res.json();
  } catch (error) {
    console.error("Error calling FastAPI:", error);
    return null;
  }
}

export async function getMlopsHealth() {
  try {
    const res = await fetch("http://localhost:8000/v1/mlops/health");
    if (!res.ok) throw new Error("API failed");
    return await res.json();
  } catch (error) {
    console.error("Error calling FastAPI:", error);
    return null;
  }
}
