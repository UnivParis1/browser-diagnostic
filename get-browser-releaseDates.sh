
curl -s https://endoflife.date/api/firefox.json > firefox-versions.json
curl -s https://raw.githubusercontent.com/berstend/chrome-versions/master/data/stable/windows/version/list.json > chrome-versions.json

curl -s https://support.apple.com/en-us/HT201222 | perl -MJSON -lne 'if (/Safari ([\d.]*)/) { $v = $1; $td = 1 } elsif ($td && /<td.*?>(.*?)</) { $td++; if ($td == 3) { $h{$v} = $1; $td = 0 } } END { print encode_json(\%h) }'  > safari-versions.json

curl -s https://raw.githubusercontent.com/MicrosoftDocs/Edge-Enterprise/public/edgeenterprise/microsoft-edge-release-schedule.md | perl -MJSON -lne 'if (/[|]\s*Release/) { @one = map { s/<.*//; $_ } split /\s*[|]\s*/; $one[4] =~ s/Week of //; push @l, { milestone => $one[1], date => $one[4], isExtended => $one[5] =~ /-.*-\d\d\d\d/ } } END { print encode_json(\@l) }' > edge-versions.json

(echo "browser_releaseDates = {"
for i in firefox chrome safari edge; do 
    echo "$i: "; cat $i-versions.json ; echo ","
done
echo "}") > browser-releaseDates.js
