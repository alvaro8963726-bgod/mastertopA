# Como gerar o APK do Master Top A

## Pré-requisitos (instalar no seu computador)

1. **Node.js 18+** → https://nodejs.org
2. **pnpm** → abra o terminal e rode: `npm install -g pnpm`
3. **Android Studio** → https://developer.android.com/studio
   - Instale o Android Studio
   - Abra, vá em: SDK Manager → instale Android SDK 34
   - Crie um emulador ou use seu celular via USB com Depuração USB ativada

## Passo a passo

```bash
# 1. Instale as dependências
pnpm install

# 2. Gere o build do app + sincronize com o Android
pnpm run cap:sync

# Isso vai criar a pasta /android no projeto

# 3. Abra no Android Studio
pnpm run cap:open

# O Android Studio abre automaticamente
# Aguarde o Gradle sincronizar (barra de progresso embaixo)

# 4. Gerar o APK de debug (para testar)
#    No Android Studio: Build → Build Bundle(s) / APK(s) → Build APK(s)
#    O APK fica em: android/app/build/outputs/apk/debug/app-debug.apk

# 5. Instalar direto no celular (com cabo USB)
pnpm run cap:run
```

## Publicar na Play Store

```bash
# 1. Gerar APK/AAB assinado (Release)
#    No Android Studio:
#    Build → Generate Signed Bundle / APK
#    → Escolha: Android App Bundle (.aab) ← recomendado para Play Store
#    → Crie uma Keystore (guarde o arquivo .jks com segurança!)
#    → Preencha: alias, senha
#    → Build type: Release
#    → O .aab fica em: android/app/build/outputs/bundle/release/

# 2. Criar conta de desenvolvedor na Play Store
#    → https://play.google.com/console
#    → Taxa única de U$25

# 3. Criar novo app na Play Store Console
#    → Nome: Master Top A
#    → Categoria: Educação
#    → Upload do .aab gerado
#    → Preencher descrição, capturas de tela, política de privacidade
#    → Enviar para revisão (leva 1-7 dias)
```

## Informações do app

- **App ID**: br.com.mastertopa.simuladocnh
- **Nome**: Master Top A
- **Versão**: 1.0.0
- **SDK mínimo**: Android 7 (API 24)
- **SDK alvo**: Android 14 (API 34)
