// ============================================================
// AGRIWATCH DROUGHT API SERVICE
// FastAPI Backend Connection
// ============================================================

import { supabase } from "../supabase/config";

const API_URL = import.meta.env.VITE_API_URL || "https://agri-watch-backend.vercel.app";


// ============================================================
// HELPER — HANDLE API RESPONSE
// ============================================================

async function handleResponse(response, defaultMessage) {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));

    throw new Error(
      errorData?.detail ||
      errorData?.error ||
      `${defaultMessage}: ${response.status}`
    );
  }

  return await response.json();
}


// ============================================================
// 1. GET PREDICTION FOR ONE DISTRICT
// ============================================================

export async function predictDistrict(districtName) {
  try {
    const response = await fetch(
      `${API_URL}/predict-district/${encodeURIComponent(districtName)}`
    );

    const data = await handleResponse(
      response,
      "Prediction failed"
    );

    console.log(
      "REAL AGRIWATCH DISTRICT PREDICTION:",
      data
    );

    return data;

  } catch (error) {
    console.error(
      "District prediction API error:",
      error
    );

    throw error;
  }
}


// ============================================================
// 2. GET ALL REAL DISTRICTS
// ============================================================

export async function getDistricts() {
  try {
    const response = await fetch(
      `${API_URL}/districts`
    );

    const data = await handleResponse(
      response,
      "Failed to load districts"
    );

    console.log(
      "REAL AGRIWATCH DISTRICTS:",
      data
    );

    return data;

  } catch (error) {
    console.error(
      "District list API error:",
      error
    );

    throw error;
  }
}


// ============================================================
// 3. GET HISTORICAL ML DATA FOR ONE DISTRICT
// ============================================================

export async function getDistrictHistory(districtName) {
  try {
    const response = await fetch(
      `${API_URL}/district-history/${encodeURIComponent(districtName)}`
    );

    const data = await handleResponse(
      response,
      "Failed to load district history"
    );

    console.log(
      "REAL AGRIWATCH DISTRICT HISTORY:",
      data
    );

    return data;

  } catch (error) {
    console.error(
      "District history API error:",
      error
    );

    throw error;
  }
}


// ============================================================
// 4. GET ML COMPARISON FOR ALL DISTRICTS
// ============================================================

export async function getDistrictComparison() {
  try {
    const response = await fetch(
      `${API_URL}/compare-districts`
    );

    const data = await handleResponse(
      response,
      "Compare districts failed"
    );

    console.log(
      "REAL AGRIWATCH DISTRICT COMPARISON:",
      data
    );

    return data;

  } catch (error) {
    console.error(
      "District comparison API error:",
      error
    );

    throw error;
  }
}


// ============================================================
// 5. GET REAL MAP DATA FOR ALL DISTRICTS
// ============================================================
// Backend endpoint:
// GET /map-data
//
// Returns:
// - district
// - province
// - latitude
// - longitude
// - drought_probability
// - drought_probability_percent
// - risk_level
// - environmental_data
// ============================================================

export async function getMapData() {
  try {
    const response = await fetch(
      `${API_URL}/map-data`
    );

    const data = await handleResponse(
      response,
      "Failed to load drought map data"
    );

    if (!data.success) {
      throw new Error(
        data.error || "Map API returned unsuccessful response"
      );
    }

    console.log(
      "REAL AGRIWATCH MAP DATA:",
      data
    );

    console.log(
      `MAP DISTRICTS RECEIVED: ${data.count}`
    );

    return data;

  } catch (error) {
    console.error(
      "Drought map API error:",
      error
    );

    throw error;
  }
}



// ============================================================
// GET NATIONAL NDVI + SOIL MOISTURE HISTORY
// ============================================================

export async function getNationalHistory() {
  try {
    const response = await fetch(
      `${API_URL}/national-history`
    );

    if (!response.ok) {
      throw new Error(
        `National history failed: ${response.status}`
      );
    }

    const data = await response.json();

    console.log(
      "REAL AGRIWATCH NATIONAL HISTORY:",
      data
    );

    return data;

  } catch (error) {

    console.error(
      "National history API error:",
      error
    );

    throw error;
  }
}




// ============================================================
// ALERT MANAGEMENT
// ============================================================


// Get saved alert history
export async function getAlerts() {
  try {
    const response = await fetch(
      `${API_URL}/alerts`
    );

    if (!response.ok) {
      throw new Error(
        `Failed to load alerts: ${response.status}`
      );
    }

    const data = await response.json();

    console.log(
      "REAL AGRIWATCH ALERT HISTORY:",
      data
    );

    return data;

  } catch (error) {
    console.error(
      "Alert history API error:",
      error
    );

    throw error;
  }
}


// Create / dispatch new alert
export async function createAlert(alertData) {
  try {
    const { data: sessionData, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (!sessionData.session?.access_token) throw new Error('Sign in before dispatching alerts.');
    const response = await fetch(
      `${API_URL}/alerts`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },

        body: JSON.stringify(alertData),
      }
    );

    const data = await response
      .json()
      .catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data?.detail ||
        `Alert dispatch failed: ${response.status}`
      );
    }

    console.log(
      "AGRIWATCH ALERT DISPATCHED:",
      data
    );

    return data;

  } catch (error) {
    console.error(
      "Alert dispatch API error:",
      error
    );

    throw error;
  }
}