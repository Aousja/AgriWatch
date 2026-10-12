import { supabase } from "../supabase/config";

// ============================================================
// GET ALL FIELDS FOR LOGGED-IN FARMER
// ============================================================

export async function getMyFields(userId) {
  if (!userId) {
    return [];
  }

  const { data, error } = await supabase
    .from("farmer_fields")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("GET FARMER FIELDS ERROR:", error);
    throw error;
  }

  console.log("REAL FARMER FIELDS:", data);

  return data || [];
}


// ============================================================
// ALIAS
// Some pages may still import getFarmerFields.
// Keeping this prevents import/export errors.
// ============================================================

export async function getFarmerFields(userId) {
  return getMyFields(userId);
}


// ============================================================
// CREATE MULTIPLE FARMER FIELDS
// ============================================================

export async function createFarmerFields(userId, fields) {
  if (!userId) {
    throw new Error("User ID is required.");
  }

  if (!Array.isArray(fields) || fields.length === 0) {
    return [];
  }

  const rows = fields
    .filter((field) => field?.crop)
    .map((field, index) => ({
      user_id: userId,

      field_name: (
        field.fieldName ||
        field.field_name ||
        `Field ${index + 1}`
      ).trim(),

      crop: String(field.crop || "").trim(),

      area_acres: Number(
        field.areaAcres ??
        field.area_acres ??
        0
      ),
    }));

  if (rows.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("farmer_fields")
    .insert(rows)
    .select();

  if (error) {
    console.error("CREATE FARMER FIELDS ERROR:", error);
    throw error;
  }

  console.log("CREATED FARMER FIELDS:", data);

  return data || [];
}


// ============================================================
// CREATE ONE FARMER FIELD
// ============================================================

export async function addFarmerField(userId, field) {
  if (!userId) {
    throw new Error("User ID is required.");
  }

  if (!field) {
    throw new Error("Field data is required.");
  }

  const createdFields = await createFarmerFields(
    userId,
    [field]
  );

  return createdFields[0] || null;
}


// ============================================================
// UPDATE FARMER FIELD
// ============================================================

export async function updateFarmerField(id, fields) {
  if (!id) {
    throw new Error("Field ID is required.");
  }

  const payload = {};

  if (
    fields.fieldName !== undefined ||
    fields.field_name !== undefined
  ) {
    payload.field_name = String(
      fields.fieldName ??
      fields.field_name ??
      ""
    ).trim();
  }

  if (fields.crop !== undefined) {
    payload.crop = String(
      fields.crop || ""
    ).trim();
  }

  if (
    fields.areaAcres !== undefined ||
    fields.area_acres !== undefined
  ) {
    payload.area_acres = Number(
      fields.areaAcres ??
      fields.area_acres ??
      0
    );
  }

  payload.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("farmer_fields")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("UPDATE FARMER FIELD ERROR:", error);
    throw error;
  }

  console.log("UPDATED FARMER FIELD:", data);

  return data;
}


// ============================================================
// DELETE FARMER FIELD
// ============================================================

export async function deleteFarmerField(id) {
  if (!id) {
    throw new Error("Field ID is required.");
  }

  const { error } = await supabase
    .from("farmer_fields")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("DELETE FARMER FIELD ERROR:", error);
    throw error;
  }

  console.log(
    "FARMER FIELD DELETED:",
    id
  );

  return true;
}