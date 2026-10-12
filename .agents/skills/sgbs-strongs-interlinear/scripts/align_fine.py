"""Fine-grained EN<->GR alignment for lesson-4 exercise pages.
Each verse: list of [english_chunk, [greek 0-based indices]].
Empty english chunk = Greek-only group; empty index list = English-only group.
"""

ALIGN_ROMANS = {
    28: [["And", [1]], ["we know", [0]], ["that", [2]], ["in all things", [7]], ["God works", [8]], ["for", [9]], ["the good", [10]], ["of those", [3]], ["who love", [4]], ["him,", [5, 6]], ["who", []], ["have been", [15]], ["called", [11, 14]], ["according to", [12]], ["his purpose.", [13]]],
    29: [["For", [0]], ["those", [1]], ["God foreknew", [2]], ["he also", [3]], ["predestined", [4]], ["to be", [11, 12, 13]], ["conformed", [5]], ["to the image", [6, 7]], ["of his Son,", [8, 9, 10]], ["that he", [14]], ["might be", []], ["the firstborn", [15]], ["among", [16]], ["many", [17]], ["brothers and sisters.", [18]]],
    30: [["And", [1]], ["those", [0]], ["he predestined,", [2]], ["he also", [3, 4]], ["called;", [5]], ["", [6]], ["those", [7]], ["he called,", [8]], ["he also", [9, 10]], ["justified;", [11]], ["those", [12, 13]], ["he justified,", [14]], ["he also", [15, 16]], ["glorified.", [17]]],
    31: [["What,", [0]], ["then,", [1]], ["shall we say", [2]], ["in response to", [3]], ["these things?", [4]], ["If", [5]], ["God is", [6, 7]], ["for", [8]], ["us,", [9]], ["who can be", [10]], ["against", [11]], ["us?", [12]]],
    32: [["He who", [0, 1]], ["did not", [5]], ["spare", [6]], ["his own", [2, 3]], ["Son,", [4]], ["but", [7]], ["gave", [11]], ["him up", [12]], ["for", [8]], ["us", [9]], ["all—how", [10, 13]], ["will he not", [14]], ["also,", [15]], ["along with", [16]], ["him,", [17]], ["graciously give", [21]], ["us", [20]], ["all things?", [18, 19]]],
    33: [["Who", [0]], ["will bring any charge", [1]], ["against", [2]], ["those whom", [3]], ["God has chosen?", [4]], ["It is God", [5]], ["who justifies.", [6, 7]]],
    34: [["Who then", [0]], ["is the one", [1]], ["who condemns?", [2]], ["No one.", []], ["Christ Jesus", [3, 4]], ["who", [5]], ["died—more", [6, 7]], ["than that,", [8]], ["who was raised", [9]], ["to life—is", []], ["at", [10, 11]], ["the right hand", [12, 13]], ["of God", [14, 15]], ["and is also", [16, 17]], ["interceding", [18]], ["for", [19]], ["us.", [20]]],
    35: [["Who", [0]], ["shall separate", [2]], ["us", [1]], ["from", [3]], ["the love", [4, 5]], ["of Christ?", [6, 7]], ["Shall trouble", [8]], ["or hardship", [9, 10]], ["or persecution", [11, 12]], ["or famine", [13, 14]], ["or nakedness", [15, 16]], ["or danger", [17, 18]], ["or sword?", [19, 20]]],
    36: [["As", [0]], ["it is written:", [1, 2]], ["“For", [3]], ["your sake", [4]], ["we face death", [5]], ["all", [6]], ["day long;", [7, 8]], ["we are considered", [9]], ["as sheep", [10, 11]], ["to be slaughtered.”", [12]]],
    37: [["No,", [0]], ["in", [1]], ["all", [3]], ["these things", [2]], ["we are more than conquerors", [4]], ["through", [5]], ["him", [6]], ["who loved", [7]], ["us.", [8]]],
    38: [["For", [1]], ["I am convinced", [0]], ["that", [2]], ["neither", [3]], ["death", [4]], ["nor", [5]], ["life,", [6]], ["neither", [7]], ["angels", [8]], ["nor", [9]], ["demons,", [10]], ["neither", [11]], ["the present", [12]], ["nor", [13]], ["the future,", [14]], ["nor", [15]], ["any powers,", [16]]],
    39: [["neither", [0]], ["height", [1]], ["nor", [2]], ["depth,", [3]], ["nor", [4]], ["anything else", [5, 7]], ["in all creation,", [6]], ["will be able", [8]], ["to separate", [10]], ["us", [9]], ["from", [11]], ["the love", [12, 13]], ["of God", [14, 15]], ["that is", [16]], ["in", [17]], ["Christ Jesus", [18, 19]], ["our", [22]], ["Lord.", [20, 21]]],
}

ALIGN_1COR = {
    1: [["If", [0]], ["I speak", [5]], ["in the", [1]], ["tongues", [2]], ["of men", [3, 4]], ["or", [6]], ["of angels,", [7, 8]], ["but", [10]], ["do not", [11]], ["have", [12]], ["love,", [9]], ["I am only", [13]], ["a resounding", [15]], ["gong", [14]], ["or", [16]], ["a clanging", [18]], ["cymbal.", [17]]],
    2: [["If", [0, 1]], ["I have", [2]], ["the gift of prophecy", [3]], ["and", [4]], ["can fathom", [5]], ["all", [8]], ["mysteries", [6, 7]], ["and", [9]], ["all knowledge,", [10, 11, 12]], ["and", [13]], ["if", [14]], ["I have", [15]], ["a faith", [16, 17, 18]], ["that can", [19]], ["move", [21]], ["mountains,", [20]], ["but", [23]], ["do not", [24]], ["have", [25]], ["love,", [22]], ["I am", [27]], ["nothing.", [26]]],
    3: [["If", [0, 1]], ["I give", [2]], ["all", [3]], ["I possess", [4, 5, 6]], ["to the poor", []], ["and", [7]], ["give over", [8, 9]], ["my", [12]], ["body", [10, 11]], ["to hardship that I may boast,", [13, 14]], ["but", [16]], ["do not", [17]], ["have", [18]], ["love,", [15]], ["I gain", [20]], ["nothing.", [19]]],
    4: [["Love", [0, 1]], ["is patient,", [2]], ["love", [4, 5]], ["is kind.", [3]], ["It does not", [6]], ["envy,", [7]], ["it", [8, 9]], ["does not", [10]], ["boast,", [11]], ["it is not", [12]], ["proud.", [13]]],
    5: [["It does not", [0]], ["dishonor others,", [1]], ["it is not", [2]], ["self-seeking,", [3, 4, 5]], ["it is not", [6]], ["easily angered,", [7]], ["it keeps no", [8, 9]], ["record of wrongs.", [10, 11]]],
    6: [["Love does not delight", [0, 1]], ["in", [2, 3]], ["evil", [4]], ["but", [6]], ["rejoices", [5]], ["with the truth.", [7, 8]]],
    7: [["It always", [0]], ["protects,", [1]], ["always", [2]], ["trusts,", [3]], ["always", [4]], ["hopes,", [5]], ["always", [6]], ["perseveres.", [7]]],
    8: [["Love", [0, 1]], ["never", [2]], ["fails.", [3]], ["But", [5]], ["where", [4]], ["there are prophecies,", [6]], ["they will cease;", [7]], ["where", [8]], ["there are tongues,", [9]], ["they will be stilled;", [10]], ["where", [11]], ["there is knowledge,", [12]], ["it will pass away.", [13]]],
    9: [["For", [2]], ["we know", [3]], ["in part", [0, 1]], ["and", [4]], ["we prophesy", [7]], ["in part,", [5, 6]]],
    10: [["but", [1]], ["when", [0]], ["completeness comes,", [2, 3, 4]], ["what is in part", [5, 6, 7]], ["disappears.", [8]]],
    11: [["When", [0]], ["I was", [1]], ["a child,", [2]], ["I talked", [3]], ["like a child,", [4, 5]], ["I thought", [6]], ["like a child,", [7, 8]], ["I reasoned", [9]], ["like a child.", [10, 11]], ["When", [12]], ["I became", [13]], ["a man,", [14]], ["I put", [15]], ["the ways", [16]], ["of childhood", [17, 18]], ["behind me.", []]],
    12: [["For", [1]], ["now", [2]], ["we see", [0]], ["only", []], ["a reflection", [5, 6]], ["as in a mirror;", [3, 4]], ["then", [7, 8]], ["we shall see", []], ["face to face.", [9, 10, 11]], ["Now", [12]], ["I know", [13]], ["in part;", [14, 15]], ["then", [16, 17]], ["I shall know fully,", [18]], ["even as", [19]], ["I am", [20]], ["fully known.", [21]]],
    13: [["And", [1]], ["now", [0]], ["these", [6, 8]], ["three", [7]], ["remain:", [2]], ["faith,", [3]], ["hope", [4]], ["and love.", [5]], ["But", [10]], ["the greatest", [9, 12]], ["of these", [11]], ["is love.", [13]]],
}

ALIGN_PHIL = {
    1: [["Therefore", [2]], ["if", [0]], ["you have any", [1]], ["encouragement", [3]], ["from being united with", [4]], ["Christ,", [5]], ["if", [6]], ["any", [7]], ["comfort", [8]], ["from his love,", [9]], ["if", [10]], ["any", [11]], ["common sharing", [12]], ["in the Spirit,", [13]], ["if", [14]], ["any", [15]], ["tenderness", [16]], ["and compassion,", [17, 18]]],
    2: [["then make", [0]], ["my", [1]], ["joy", [2, 3]], ["complete", []], ["by being like-minded,", [4, 5, 6, 7]], ["having", [11]], ["the same", [8, 9]], ["love,", [10]], ["being one in spirit", [12]], ["and of one mind.", [13, 14, 15]]],
    3: [["Do nothing", [0]], ["out of", [1]], ["selfish ambition", [2]], ["or", [3]], ["vain conceit.", [4, 5]], ["Rather,", [6]], ["in humility", [7, 8]], ["value", [10]], ["others", [9]], ["above yourselves,", [11, 12]]],
    4: [["not", [0]], ["looking", [4]], ["to your own interests", [1, 2]], ["but", [5]], ["each of you", [3, 6]], ["to the interests", [7]], ["of the others.", [8, 9]]],
    5: [["In your relationships with one another,", [2, 3]], ["have the same mindset", [0, 1]], ["as Christ Jesus:", [4, 5, 6, 7, 8]]],
    6: [["Who, being", [0, 4]], ["in very nature", [1, 2]], ["God,", [3]], ["did not", [5]], ["consider", [7]], ["equality", [10]], ["with God", [8, 9, 11]], ["something to be used to his own advantage;", [6]]],
    7: [["rather,", [0]], ["he made", [2]], ["himself", [1]], ["nothing", []], ["by taking", [5]], ["the very nature of a servant,", [3, 4]], ["being made in human likeness.", [6, 7, 8, 9]], ["", [10, 11, 12, 13, 14]]],
    8: [["And being found in appearance as a man,", []], ["he humbled himself", [0, 1]], ["by becoming", [2]], ["obedient", [3]], ["to death—", [4, 5]], ["even", [7]], ["death", [6]], ["on a cross!", [8]]],
    9: [["Therefore", [0, 1]], ["God", [2, 3]], ["exalted", [5]], ["him", [4]], ["to the highest place", []], ["and", [6]], ["gave", [7]], ["him", [8]], ["the name", [9, 10]], ["that is above", [11, 12]], ["every", [13]], ["name,", [14]]],
    10: [["that", [0]], ["at the name", [1, 2, 3]], ["of Jesus", [4]], ["every knee", [5, 6]], ["should bow,", [7]], ["in heaven", [8]], ["and on earth", [9, 10]], ["and under the earth,", [11, 12]]],
    11: [["and", [0]], ["every tongue", [1, 2]], ["acknowledge", [3]], ["that", [4]], ["Jesus Christ", [6, 7]], ["is Lord,", [5]], ["to", [8]], ["the glory", [9]], ["of God", [10]], ["the Father.", [11]]],
}

ALIGN_GAL = {
    13: [["You,", [0, 1]], ["my", []], ["brothers and sisters,", [5]], ["were called", [4]], ["to be free.", [2, 3]], ["But do not", [6, 7]], ["use", []], ["your freedom", [8, 9]], ["to indulge", [10, 11]], ["the flesh;", [12, 13]], ["rather,", [14]], ["serve", [18]], ["one another", [19]], ["humbly", []], ["in love.", [15, 16, 17]]],
    14: [["For", [1]], ["the", [0]], ["entire", [2]], ["law", [3]], ["is fulfilled", [7]], ["in keeping", [8, 9]], ["this one command:", [4, 5, 6]], ["“Love", [10]], ["your", [13]], ["neighbor", [11, 12]], ["as yourself.”", [14, 15]]],
    15: [["If", [0, 1]], ["you bite", [3]], ["and", [4]], ["devour", [5]], ["each other,", [2]], ["watch out", [6]], ["or you will be destroyed", [7, 10]], ["by each other.", [8, 9]]],
    16: [["So I say,", [0, 1]], ["walk", [3]], ["by the Spirit,", [2]], ["and", [4]], ["you will not", [7, 8]], ["gratify", [9]], ["the desires of the flesh.", [5, 6]]],
    17: [["For", [1]], ["the flesh", [0, 2]], ["desires", [3]], ["what is contrary", [4]], ["to the Spirit,", [5, 6]], ["and", [8]], ["the Spirit", [7, 9]], ["what is contrary to", [10]], ["the flesh.", [11, 12]], ["They", [13, 14]], ["are in conflict", [16]], ["with each other,", [15]], ["so that", [17]], ["you are not to do", [18, 23]], ["whatever", [19]], ["you want.", [20, 21, 22]]],
    18: [["But", [1]], ["if", [0]], ["you are led", [3]], ["by the Spirit,", [2]], ["you are", [5]], ["not", [4]], ["under", [6]], ["the law.", [7]]],
    19: [["The acts", [3, 4]], ["of the flesh", [5, 6]], ["are obvious:", [0, 1, 2]], ["sexual immorality,", [7, 8, 9]], ["impurity", [10]], ["and debauchery;", [11]]],
    20: [["idolatry", [0]], ["and witchcraft;", [1]], ["hatred,", [2]], ["discord,", [3]], ["jealousy,", [4]], ["fits of rage,", [5]], ["selfish ambition,", [6]], ["dissensions,", [7]], ["factions", [8]]],
    21: [["and envy;", [0]], ["drunkenness,", [1]], ["orgies,", [2]], ["and", [3]], ["the like.", [4, 5, 6]], ["I warn", [7, 8]], ["you,", [9]], ["as", [10]], ["I did before,", [11]], ["that", [12]], ["those", [13]], ["who live like this", [14, 15, 16]], ["will not", [19]], ["inherit", [20]], ["the kingdom", [17]], ["of God.", [18]]],
    22: [["But", [1]], ["the fruit", [0, 2]], ["of the Spirit", [3, 4]], ["is", [5]], ["love,", [6]], ["joy,", [7]], ["peace,", [8]], ["forbearance,", [9]], ["kindness,", [10]], ["goodness,", [11]], ["faithfulness,", [12]]],
    23: [["gentleness", [0]], ["and self-control.", [1]], ["Against", [2]], ["such things", [3, 4]], ["there is", [6]], ["no law.", [5, 7]]],
    24: [["Those", [0, 1]], ["who belong to", [2]], ["Christ Jesus", [3, 4]], ["have crucified", [7]], ["the flesh", [5, 6]], ["with", [8]], ["its passions", [9, 10]], ["and", [11]], ["desires.", [12, 13]]],
    25: [["Since", [0]], ["we live", [1]], ["by the Spirit,", [2]], ["let us keep in step", [5]], ["with the Spirit.", [3, 4]]],
    26: [["Let us not", [0, 1]], ["become conceited,", [2]], ["provoking", [3, 4]], ["and envying each other.", [5, 6]]],
}
