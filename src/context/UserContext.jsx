import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../supabaseClient';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let activo = true;

    // Función para obtener el perfil desde tu tabla pública "Usuario"
    const fetchProfile = async (userId) => {
      const { data, error } = await supabase
        .from('Usuario')
        .select('*')
        .eq('id_usuario', userId)
        .single();

      if (!activo) return;
      if (!error) setUserProfile(data);
      else setUserProfile(null);
      setLoading(false);
    };

    // Sesión inicial (evita depender de INITIAL_SESSION dentro del callback,
    // que puede deadlockear si hay awaits mientras Realtime toma el lock del cliente).
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!activo) return;
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    // Escuchar cambios posteriores (login/logout). No usar await aquí.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!activo) return;
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      activo = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <UserContext.Provider value={{ userProfile, loading }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);