// js/core/event_bus.js

class EventBusSystem {
  constructor() {
    this.listeners = {};
  }

  // Subscribe to an event (e.g., a Status Manager listening for a turn to start)
  on(eventName, callback) {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }
    this.listeners[eventName].push(callback);
  }

  // Broadcast an event to all subscribers (e.g., the Engine announcing an attack)
  emit(eventName, data) {
    if (this.listeners[eventName]) {
      this.listeners[eventName].forEach((callback) => callback(data));
    }
  }

  // Remove a specific listener or clear all
  off(eventName, callback) {
    if (!this.listeners[eventName]) return;
    this.listeners[eventName] = this.listeners[eventName].filter(
      (cb) => cb !== callback,
    );
  }
}

// Export a single, global instance of the Event Bus
export const EventBus = new EventBusSystem();
