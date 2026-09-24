const form = document.querySelector(".form-wrap");

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("usuario").value.trim();
    const senha = document.getElementById("senha").value;

    try {
        const response = await fetch("http://localhost:8082/usuarios/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: email,
                senha: senha
            })
        });

        if (response.status === 404) {
            alert("Endpoint de login não encontrado no backend.");
            return;
        }

        if (!response.ok) {
            alert("Email ou senha inválidos.");
            return;
        }

        const dados = await response.json();

        console.log("Login:", dados);

        alert("Login realizado com sucesso!");

    } catch (erro) {
        console.error(erro);
        alert("Não foi possível conectar ao servidor.");
    }
});