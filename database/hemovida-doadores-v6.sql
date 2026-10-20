-- -----------------------------------------------------
-- Table `doador`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `doador` (
  `doador_id` INT NOT NULL AUTO_INCREMENT,
  `usuario_id` INT NOT NULL,
  `doador_nome` VARCHAR(255) NOT NULL,
  `doador_cpf` VARCHAR(11) NOT NULL UNIQUE,
  `doador_data_nascimento` DATE NOT NULL,
  `doador_genero` ENUM('Feminino', 'Masculino', 'Outros') NOT NULL,
  `doador_tipo_sanguineo` ENUM('A', 'B', 'AB', 'O') NOT NULL,
  `doador_fator_rh` ENUM('+', '-') NOT NULL,
  `doador_telefone` VARCHAR(15) NOT NULL,
  `doador_email` VARCHAR(255) NOT NULL,
  `doador_cep` VARCHAR(8) NOT NULL,
  `doador_endereco` VARCHAR(255) NOT NULL,
  `doador_status` INT NOT NULL,
  PRIMARY KEY (`doador_id`)
);

-- -----------------------------------------------------
-- Table `doacao`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `doacao` (
  `doacao_id` INT NOT NULL AUTO_INCREMENT,
  `doacao_codigo_bolsa` VARCHAR(20) NOT NULL,
  `doacao_tipo` ENUM('Sangue Total', 'Aférese', 'Autóloga') NOT NULL,
  `doacao_data_hora` DATETIME NOT NULL,
  `doacao_status_coleta` INT NOT NULL,
  `doacao_resultado_exame` ENUM('Pendente', 'Apto', 'Inapto') NOT NULL,
  `doacao_status_devolutiva` INT NOT NULL,
  `doador_id` INT NOT NULL,
  `doacao_status` INT NOT NULL,
  `funcionario_id` INT NOT NULL,
  PRIMARY KEY (`doacao_id`),
  INDEX `fk_doacao_doador_idx` (`doador_id`),
  INDEX `idx_doacao_funcionario` (`funcionario_id`),
  CONSTRAINT `fk_doacao_doador`
    FOREIGN KEY (`doador_id`)
    REFERENCES `doador` (`doador_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION
);

-- -----------------------------------------------------
-- Table `triagem_pergunta`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `triagem_pergunta` (
  `triagem_pergunta_id` INT NOT NULL AUTO_INCREMENT,
  `triagem_pergunta_descricao` VARCHAR(255) NOT NULL,
  `triagem_pergunta_tipo` VARCHAR(45) NULL,
  `triagem_pergunta_status` INT NOT NULL,
  PRIMARY KEY (`triagem_pergunta_id`)
);

-- -----------------------------------------------------
-- Table `triagem`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `triagem` (
  `triagem_id` INT NOT NULL AUTO_INCREMENT,
  `triagem_peso_kg` DECIMAL(5,2) NOT NULL,
  `triagem_pressao_arterial` VARCHAR(10) NOT NULL,
  `triagem_hemoglobina` DECIMAL(5,2) NOT NULL,
  `triagem_data` DATETIME NOT NULL,
  `triagem_status` INT NOT NULL,
  `doacao_id` INT NOT NULL,
  `funcionario_id` INT NOT NULL,
  PRIMARY KEY (`triagem_id`),
  INDEX `fk_triagem_doacao1_idx` (`doacao_id`),
  INDEX `idx_triagem_funcionario` (`funcionario_id`),
  CONSTRAINT `fk_triagem_doacao1`
    FOREIGN KEY (`doacao_id`)
    REFERENCES `doacao` (`doacao_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION
);

-- -----------------------------------------------------
-- Table `pergunta_opcoes`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `pergunta_opcoes` (
  `pergunta_opcoes_id` INT NOT NULL AUTO_INCREMENT,
  `pergunta_opcoes_descricao` VARCHAR(255) NULL,
  `pergunta_opcoes_status` INT NOT NULL,
  `triagem_pergunta_id` INT NOT NULL,
  INDEX `fk_pergunta_opcoes_triagem_pergunta1_idx` (`triagem_pergunta_id`),
  PRIMARY KEY (`pergunta_opcoes_id`),
  CONSTRAINT `fk_pergunta_opcoes_triagem_pergunta1`
    FOREIGN KEY (`triagem_pergunta_id`)
    REFERENCES `triagem_pergunta` (`triagem_pergunta_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION
);

-- -----------------------------------------------------
-- Table `triagem_resposta`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `triagem_resposta` (
  `triagem_resposta_id` INT NOT NULL AUTO_INCREMENT,
  `triagem_resposta_valor` TINYINT NOT NULL,
  `triagem_id` INT NOT NULL,
  `pergunta_id` INT NOT NULL,
  `pergunta_opcoes_id` INT NULL,
  `triagem_resposta_status` INT NOT NULL,
  PRIMARY KEY (`triagem_resposta_id`),
  INDEX `fk_triagem_resposta_triagem1_idx` (`triagem_id`),
  INDEX `fk_triagem_resposta_pergunta1_idx` (`pergunta_id`),
  INDEX `fk_triagem_resposta_pergunta_opcoes1_idx` (`pergunta_opcoes_id`),
  CONSTRAINT `fk_triagem_resposta_triagem1`
    FOREIGN KEY (`triagem_id`)
    REFERENCES `triagem` (`triagem_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_triagem_resposta_pergunta1`
    FOREIGN KEY (`pergunta_id`)
    REFERENCES `triagem_pergunta` (`triagem_pergunta_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_triagem_resposta_pergunta_opcoes1`
    FOREIGN KEY (`pergunta_opcoes_id`)
    REFERENCES `pergunta_opcoes` (`pergunta_opcoes_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION
);

-- -----------------------------------------------------
-- Table `coleta`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `coleta` (
  `coleta_id` INT NOT NULL AUTO_INCREMENT,
  `coleta_volume_ml` INT NOT NULL,
  `coleta_data_hora` DATETIME NOT NULL,
  `coleta_status` INT NOT NULL,
  `doacao_id` INT NOT NULL,
  `funcionario_id` INT NOT NULL,
  PRIMARY KEY (`coleta_id`),
  INDEX `fk_coleta_doacao1_idx` (`doacao_id`),
  INDEX `idx_coleta_funcionario` (`funcionario_id`),
  CONSTRAINT `fk_coleta_doacao1`
    FOREIGN KEY (`doacao_id`)
    REFERENCES `doacao` (`doacao_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION
);

-- -----------------------------------------------------
-- Table `notificacao`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `notificacao` (
  `notificacao_id` INT NOT NULL AUTO_INCREMENT,
  `notificacao_titulo` VARCHAR(100) NOT NULL,
  `notificacao_mensagem` VARCHAR(255) NOT NULL,
  `notificacao_data_envio` DATETIME NOT NULL,
  `notificacao_lida` TINYINT NOT NULL DEFAULT 0,
  `doador_id` INT NOT NULL,
  PRIMARY KEY (`notificacao_id`),
  INDEX `fk_notificacao_doador_idx` (`doador_id`),
  CONSTRAINT `fk_notificacao_doador`
    FOREIGN KEY (`doador_id`)
    REFERENCES `doador` (`doador_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION
);