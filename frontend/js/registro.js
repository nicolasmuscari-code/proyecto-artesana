// Buscamos el formulario de creación de cuenta
const formularioRegistro = document.getElementById("form-registro");


// Comprobamos que el formulario exista en la página
if (formularioRegistro) {

    // Detectamos cuando el usuario intenta crear su cuenta
    formularioRegistro.addEventListener("submit", function(event) {

        // Evitamos que el formulario recargue la página
        event.preventDefault();


        // Obtenemos los datos ingresados por el usuario
        const nombre = document.getElementById("nombre").value.trim();
        const apellido = document.getElementById("apellido").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const confirmarPassword = document.getElementById("confirmar-password").value;


        // Comprobamos que todos los campos tengan información
        if (
            nombre === "" ||
            apellido === "" ||
            email === "" ||
            password === "" ||
            confirmarPassword === ""
        ) {

            alert("Por favor, completá todos los campos.");

            return;
        }


        // Comprobamos que las contraseñas coincidan
        if (password !== confirmarPassword) {

            alert("Las contraseñas no coinciden.");

            return;
        }


        // Creamos el objeto con los datos del usuario
        const usuario = {

            nombre: nombre,
            apellido: apellido,
            email: email,
            password: password

        };


        // Enviamos los datos del usuario al Backend de Artesana
        fetch (`${API_BASE_URL}/usuarios`, {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(usuario)

        })

        .then(response => {

            // Comprobamos si el servidor respondió correctamente
            if (!response.ok) {

                throw new Error("No se pudo registrar el usuario.");

            }

            return response.json();

        })

        .then(data => {

            // Informamos que el registro fue exitoso
            alert("Cuenta creada correctamente.");

            // Enviamos al usuario a la página de Login
            window.location.href = "login.html";

        })

        .catch(error => {

            // Mostramos el error si algo salió mal
            console.error("Error al registrar usuario:", error);

            alert("No se pudo crear la cuenta. Intentá nuevamente.");

        });

    });

}