type Listener = () => void;
const listeners: Listener[] = [];

export const authEvents = {
  subscribe: (listener: Listener) => {
    listeners.push(listener);
    return () => {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  },
  emitUnauthorized: () => {
    listeners.forEach((listener) => listener());
  },
};
