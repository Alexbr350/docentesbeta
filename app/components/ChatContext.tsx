"use client";
import { createContext, useContext, useState, ReactNode } from "react";

// ChatBubble.tsx se renderiza una sola vez dentro de Navbar.tsx (y Navbar
// aparece en cada página), pero necesitamos poder "abrirlo" desde otras
// páginas — por ejemplo, desde el botón "Responder en privado" de una
// publicación de "Pedir ayuda" en app/page.tsx. Como no hay una forma directa
// de pasarle props a un componente que ya está montado en otro lugar del
// árbol, usamos el mismo patrón que ya existe en Toast.tsx (un Context +
// Provider en el layout raíz): cualquier página llama a useChat() para pedir
// que se abra una conversación específica, y ChatBubble escucha ese pedido.

export type OrigenChat = {
  /** Publicación de origen (ej. un "Pedir ayuda") que justifica chatear sin ser amigos. */
  postId: string;
  esPeticionAyuda?: boolean;
};

export type DestinoChat = {
  email: string;
  nombre: string;
  origen?: OrigenChat;
};

type ChatContextType = {
  /** Se pone en un valor distinto de null cuando alguien pide abrir un chat puntual; ChatBubble lo consume y lo limpia. */
  destinoSolicitado: DestinoChat | null;
  abrirChatConUsuario: (destino: DestinoChat) => void;
  limpiarDestinoSolicitado: () => void;
};

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [destinoSolicitado, setDestinoSolicitado] = useState<DestinoChat | null>(null);

  const abrirChatConUsuario = (destino: DestinoChat) => setDestinoSolicitado(destino);
  const limpiarDestinoSolicitado = () => setDestinoSolicitado(null);

  return (
    <ChatContext.Provider value={{ destinoSolicitado, abrirChatConUsuario, limpiarDestinoSolicitado }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const contexto = useContext(ChatContext);
  if (!contexto) throw new Error("useChat debe usarse dentro de <ChatProvider>.");
  return contexto;
}
