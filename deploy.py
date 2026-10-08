from zipfile import ZipFile
for name in ['calcloude-game-platform-20261008.zip', 'calcloude-presentation-1.zip', 'calcloude-presentation-2.zip']:
    with ZipFile(name) as bundle: bundle.extractall("public")
