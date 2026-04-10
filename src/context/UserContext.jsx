import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../supabaseClient';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Función para obtener el perfil desde tu tabla pública "Usuario"
    const fetchProfile = async (userId) => {
      const { data, error } = await supabase
        .from('Usuario')
        .select('*')
        .eq('id_usuario', userId)
        .single();

      if (!error) setUserProfile(data);
      setLoading(false);
    };

    // Escuchar cambios en la sesión de Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        await fetchProfile(session.user.id);
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <UserContext.Provider value={{ userProfile, loading }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);