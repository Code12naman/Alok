interface OrderAttemptRecord {
  userId?: unknown;
  checkoutAttemptId?: unknown;
  checkoutAttemptKey?: unknown;
}

interface OrderIdReservation {
  userId?: unknown;
  attemptKey?: unknown;
}

export function isSameOrderAttempt(
  record: OrderAttemptRecord,
  userId: string,
  orderId: string,
  attemptKey: string
): boolean {
  return record.userId === userId &&
    record.checkoutAttemptId === orderId &&
    (record.checkoutAttemptKey || orderId) === attemptKey;
}

export function ownsOrderIdReservation(
  reservation: OrderIdReservation,
  userId: string,
  orderId: string,
  attemptKey: string
): boolean {
  return reservation.userId === userId && (reservation.attemptKey || orderId) === attemptKey;
}
