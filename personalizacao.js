
async function verificarAdmin() {
  try {
    const cliente = typeof db !== "undefined" && db
      ? db
      : api();

    const { data: auth, error: authError } =
      await cliente.auth.getUser();

    if (authError || !auth?.user) {
      status("Entre novamente na sua conta.", true);
      return false;
    }

    const { data: perfil, error } = await cliente
      .from("profiles")
      .select("role,approved")
      .eq("id", auth.user.id)
      .single();

    if (error) {
      status("Erro ao verificar administrador: " + error.message, true);
      return false;
    }

    return perfil?.role === "admin" &&
           perfil?.approved === true;

  } catch (erro) {
    console.error(erro);
    return false;
  }
}
