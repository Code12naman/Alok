import { auth } from "@/firebase/config";

async function adminRequest(
  path: string,
  method: "DELETE" | "PATCH",
  fallbackMessage: string
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("Administrator authentication is required.");

  const token = await user.getIdToken();
  const response = await fetch(path, {
    method,
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof body.error === "string" ? body.error : fallbackMessage);
  }
}

export const deleteCustomerAsAdmin = (customerId: string) =>
  adminRequest(
    `/api/admin/customers/${encodeURIComponent(customerId)}`,
    "DELETE",
    "Unable to delete customer."
  );

export const deleteOrderAsAdmin = (orderId: string) =>
  adminRequest(
    `/api/admin/orders/${encodeURIComponent(orderId)}`,
    "DELETE",
    "Unable to delete order."
  );

export const archiveCustomerAsAdmin = (customerId: string) =>
  adminRequest(
    `/api/admin/customers/${encodeURIComponent(customerId)}`,
    "PATCH",
    "Unable to archive customer."
  );

export const archiveOrderAsAdmin = (orderId: string) =>
  adminRequest(
    `/api/admin/orders/${encodeURIComponent(orderId)}`,
    "PATCH",
    "Unable to archive order."
  );
