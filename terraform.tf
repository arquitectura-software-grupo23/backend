provider "aws" {
  region = "us-east-1"
}


variable "EC2_ip" {
  description = "La dirección IP pública de la instancia EC2 existente"
}


variable "SSH_PRIVATE_KEY" {
  description = "Clave privada SSH para la conexión remota"
  sensitive   = true
}


resource "null_resource" "docker_update" {
  # Los triggers aquí se pueden configurar para que el provisionador se ejecute
  # solo cuando haya cambios específicos que tú definas.
  triggers = {
    always_run = "${timestamp()}"
  }

  provisioner "remote-exec" {
    # Los comandos que se ejecutan para actualizar el docker-compose.
    inline = [
      "sudo git pull"
      "sudo docker-compose build"
      "sudo docker-compose up -d"
    ]

    # La conexión define cómo Terraform se conecta a la instancia remota.
    connection {
      type        = "ssh"
      user        = "ubuntu" 
      private_key = var.SSH_PRIVATE_KEY
      host        = var.EC2_ip
    }
  }
}
