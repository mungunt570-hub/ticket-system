var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/validation.ts
function isReservationInput(value) {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const data = value;
  if (typeof data.eventId !== "string" || data.eventId.trim().length === 0) {
    return false;
  }
  if (typeof data.customerName !== "string" || data.customerName.trim().length === 0) {
    return false;
  }
  if (typeof data.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return false;
  }
  if (typeof data.quantity !== "number" || !Number.isInteger(data.quantity) || data.quantity < 1 || data.quantity > 10) {
    return false;
  }
  return true;
}
__name(isReservationInput, "isReservationInput");

// src/index.ts
var index_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (request.method === "GET" && path === "/health") {
      return Response.json({
        status: "ok",
        service: "global-event-ticket-reservation",
        version: "week9-v1"
      });
    }
    if (request.method === "GET" && path === "/events") {
      const result = await env.DB.prepare(
        `SELECT *
         FROM events
         ORDER BY id`
      ).all();
      const notice = await env.META.get("system:notice");
      return Response.json({
        events: result.results,
        notice
      });
    }
    if (request.method === "POST" && path === "/reservations") {
      let body;
      try {
        body = await request.json();
      } catch {
        return Response.json(
          { error: "Invalid JSON" },
          { status: 400 }
        );
      }
      if (!isReservationInput(body)) {
        return Response.json(
          { error: "Invalid reservation input" },
          { status: 400 }
        );
      }
      const event = await env.DB.prepare(
        "SELECT id FROM events WHERE id = ?"
      ).bind(body.eventId).first();
      if (!event) {
        return Response.json(
          { error: "Event not found" },
          { status: 404 }
        );
      }
      const reservationId = crypto.randomUUID();
      try {
        await env.DB.prepare(
          `INSERT INTO reservations
           (id, event_id, customer_name, email, quantity)
           VALUES (?, ?, ?, ?, ?)`
        ).bind(
          reservationId,
          body.eventId,
          body.customerName,
          body.email,
          body.quantity
        ).run();
        return Response.json(
          {
            reservationId,
            eventId: body.eventId,
            quantity: body.quantity,
            status: "CONFIRMED"
          },
          { status: 201 }
        );
      } catch (error) {
        if (error instanceof Error && error.message.includes("not enough tickets")) {
          return Response.json(
            { error: "Not enough tickets" },
            { status: 409 }
          );
        }
        return Response.json(
          { error: "Reservation failed" },
          { status: 500 }
        );
      }
    }
    const match = path.match(/^\/reservations\/([^/]+)$/);
    if (match) {
      const reservationId = match[1];
      if (request.method === "GET") {
        const reservation = await env.DB.prepare(
          `SELECT *
           FROM reservations
           WHERE id = ?`
        ).bind(reservationId).first();
        if (!reservation) {
          return Response.json(
            { error: "Reservation not found" },
            { status: 404 }
          );
        }
        return Response.json(reservation);
      }
      if (request.method === "DELETE") {
        const result = await env.DB.prepare(
          `UPDATE reservations
           SET status = 'CANCELLED'
           WHERE id = ?
           AND status = 'CONFIRMED'`
        ).bind(reservationId).run();
        if (result.meta.changes === 0) {
          return Response.json(
            { error: "Active reservation not found" },
            { status: 404 }
          );
        }
        return Response.json({
          reservationId,
          status: "CANCELLED"
        });
      }
    }
    return Response.json(
      { error: "Not found" },
      { status: 404 }
    );
  }
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
